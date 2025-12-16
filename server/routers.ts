import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { InsertOrder, InsertOrderItem } from "../drizzle/schema";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

// Middleware para verificar se o usuário é admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado. Apenas administradores.' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========== Categories (Admin only) ==========
  categories: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCategories();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),
  }),

  // ========== Products ==========
  products: router({
    list: publicProcedure.query(async () => {
      return await db.getAllProducts();
    }),
    available: publicProcedure.query(async () => {
      return await db.getAvailableProducts();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        pricePerKg: z.number().min(0), // Em centavos
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        available: z.boolean().default(true),
        stockKg: z.number().default(0), // Em gramas
      }))
      .mutation(async ({ input }) => {
        const result = await db.createProduct(input);
        return { success: true, id: result.insertId };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        pricePerKg: z.number().min(0).optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        available: z.boolean().optional(),
        stockKg: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProduct(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProduct(input.id);
        return { success: true };
      }),
    bulkUpdateAvailability: adminProcedure
      .input(z.object({
        productIds: z.array(z.number()),
        available: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.bulkUpdateProductAvailability(input.productIds, input.available);
        return { success: true, count: input.productIds.length };
      }),
    uploadImage: adminProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const fileKey = `products/${input.fileName}-${randomSuffix}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return { url, key: fileKey };
      }),
  }),

  // ========== Orders ==========
  orders: router({
    listAll: adminProcedure.query(async () => {
      return await db.getAllOrders();
    }),
    listByCategory: adminProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrdersByCategory(input.categoryId);
      }),
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrdersByUserId(ctx.user.id);
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        const items = await db.getOrderItems(input.id);
        return { order, items };
      }),
    create: publicProcedure
      .input(z.object({
        items: z.array(z.object({
          productId: z.number(),
          quantityGrams: z.number().positive(),
          cutTypeName: z.string().optional(),
        })),
        customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        customerPhone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
        notes: z.string().optional(),
        deliveryAddress: z.string().min(10, 'Endereço deve ter pelo menos 10 caracteres'),
        paymentMethod: z.enum(['card', 'pix', 'cash']),
        changeFor: z.number().optional(), // Valor em centavos para troco (apenas para pagamento em dinheiro)
      }))
      .mutation(async ({ ctx, input }) => {
        // Validar e calcular totais
        let totalAmount = 0;
        const orderItemsData: InsertOrderItem[] = [];
        
        for (const item of input.items) {
          const product = await db.getProductById(item.productId);
          if (!product) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Produto ${item.productId} não encontrado` });
          }
          if (!product.available) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Produto ${product.name} não está disponível` });
          }
          
          // Calcular subtotal: (preço por kg em centavos × quantidade em gramas) / 1000
          const subtotal = Math.round((product.pricePerKg * item.quantityGrams) / 1000);
          totalAmount += subtotal;
          
          orderItemsData.push({
            orderId: 0, // Será preenchido após criar o pedido
            productId: product.id,
            productName: product.name,
            pricePerKg: product.pricePerKg,
            quantityGrams: item.quantityGrams,
            subtotal,
            cutTypeName: item.cutTypeName || null,
          });
        }
        
        // Buscar taxa de entrega e adicionar ao total
        const deliveryFee = await db.getDeliveryFee();
        const totalWithDelivery = totalAmount + deliveryFee;
        
        const orderData: InsertOrder = {
          userId: ctx.user?.id || null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          totalAmount: totalWithDelivery,
          notes: input.notes,
          deliveryDate: null,
          deliveryAddress: input.deliveryAddress,
          paymentMethod: input.paymentMethod,
          changeFor: input.paymentMethod === 'cash' ? input.changeFor : null,
        };
        
        const orderId = await db.createOrderWithItems(orderData, orderItemsData);
        
        // Notificar o proprietário sobre novo pedido
        await notifyOwner({
          title: 'Novo Pedido Recebido',
          content: `Pedido #${orderId} de ${input.customerName} (${input.customerPhone}) - Total: R$ ${(totalWithDelivery / 100).toFixed(2)} - Endereço: ${input.deliveryAddress}`,
        });
        
        return { success: true, orderId };
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
      }))
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.id, input.status);
        return { success: true };
      }),
    countPending: publicProcedure.query(async () => {
      return await db.countPendingOrders();
    }),
  }),

  // ========== Addresses (Protected) ==========
  addresses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAddresses(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        label: z.string().optional(),
        street: z.string().min(1),
        number: z.string().min(1),
        complement: z.string().optional(),
        neighborhood: z.string().min(1),
        city: z.string().min(1),
        state: z.string().length(2),
        zipCode: z.string().min(8),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAddress({
          ...input,
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateAddress(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteAddress(input.id, ctx.user.id);
      }),
  }),

  // ========== Cut Types (Tipos de Corte) ==========
  cutTypes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCutTypes();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCutType(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCutType(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCutType(input.id);
      }),
    // Obter cortes disponíveis para um produto
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductCutTypes(input.productId);
      }),
    // Adicionar corte a um produto
    addToProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        cutTypeId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.addCutTypeToProduct(input.productId, input.cutTypeId);
      }),
    // Remover corte de um produto
    removeFromProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        cutTypeId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeCutTypeFromProduct(input.productId, input.cutTypeId);
      }),
  }),

  // ========== Quick Quantities (Quantidades Rápidas) ==========
  quickQuantities: router({
    list: publicProcedure.query(async () => {
      return await db.getAllQuickQuantities();
    }),
    create: adminProcedure
      .input(z.object({
        valueGrams: z.number().min(1),
        label: z.string().min(1),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createQuickQuantity(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        valueGrams: z.number().min(1).optional(),
        label: z.string().min(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateQuickQuantity(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteQuickQuantity(input.id);
      }),
    // Obter quantidades disponíveis para um produto
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductQuickQuantities(input.productId);
      }),
    // Adicionar quantidade a um produto
    addToProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        quickQuantityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.addQuickQuantityToProduct(input.productId, input.quickQuantityId);
      }),
    // Remover quantidade de um produto
    removeFromProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        quickQuantityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeQuickQuantityFromProduct(input.productId, input.quickQuantityId);
      }),
  }),

  // ========== System Settings (Configurações do Sistema) ==========
  settings: router({
    getDeliveryFee: publicProcedure.query(async () => {
      return await db.getDeliveryFee();
    }),
    setDeliveryFee: adminProcedure
      .input(z.object({
        feeInCents: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        await db.setDeliveryFee(input.feeInCents);
        return { success: true };
      }),
    getAll: adminProcedure.query(async () => {
      return await db.getAllSystemSettings();
    }),
  }),

  // ========== Admin Authentication & Users ==========
  adminAuth: router({
    // Login com usuário e senha
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getAdminUserByUsername(input.username);
        
        if (!user || !user.active) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário ou senha inválidos' });
        }
        
        // Importar bcrypt para verificar senha
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário ou senha inválidos' });
        }
        
        // Atualizar último login
        await db.updateAdminLastLogin(user.id);
        
        // Retornar dados do usuário (sem senha)
        const { passwordHash, ...userData } = user;
        return { user: userData, success: true };
      }),
    
    // Verificar se está logado (baseado em sessionStorage no frontend)
    checkAuth: publicProcedure.query(() => {
      // Frontend gerencia autenticação via sessionStorage
      return { authenticated: true };
    }),
  }),

  adminUsers: router({
    list: adminProcedure.query(async () => {
      const users = await db.listAdminUsers();
      // Remover passwordHash de todos os usuários
      return users.map(({ passwordHash, ...user }) => user);
    }),
    
    create: adminProcedure
      .input(z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(6),
        name: z.string().min(1).max(100),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar se username já existe
        const existing = await db.getAdminUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nome de usuário já existe' });
        }
        
        // Hash da senha
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        const newUser = await db.createAdminUser({
          username: input.username,
          passwordHash,
          name: input.name,
          email: input.email,
          active: true,
        });
        
        const { passwordHash: _, ...userData } = newUser;
        return userData;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, password, ...data } = input;
        
        let updateData: any = { ...data };
        
        // Se senha foi fornecida, fazer hash
        if (password) {
          const bcrypt = await import('bcryptjs');
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        
        await db.updateAdminUser(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Não permitir deletar se for o único admin ativo
        const allUsers = await db.listAdminUsers();
        const activeUsers = allUsers.filter(u => u.active);
        
        if (activeUsers.length === 1 && activeUsers[0].id === input.id) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Não é possível deletar o único usuário ativo' 
          });
        }
        
        await db.deleteAdminUser(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

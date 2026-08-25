import {
  buildAdminLogoutCookie,
  buildAdminSessionCookie,
  createAdminToken,
} from "./_core/adminAuth";
import { hashPassword, verifyPassword } from "./_core/password";
import { publicProcedure, adminProcedure, router, zin } from "./_core/trpc";
import {
  getStoreStatus,
  WEEKDAY_NAMES,
  isValidDayHours,
  isValidTime,
  type BusinessHours,
} from "@shared/businessHours";
import {
  calcSubtotal,
  formatQuantity,
  maxQuantity,
  minQuantity,
  SALE_UNITS,
} from "@shared/quantity";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { InsertOrder, InsertOrderItem } from "../drizzle/schema";
import { storagePut } from "./storage";

/** Decodifica base64 sem depender de Buffer, que não existe no Workers. */
function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// NOTA: a autenticação do painel usa login usuário/senha (tabela adminUsers)
// e emite um cookie httpOnly assinado. As rotas administrativas usam
// adminProcedure, que valida esse cookie no servidor - o sessionStorage do
// frontend é apenas conveniência de UI e não autoriza nada.

export const appRouter = router({
  // ========== Categories (Admin only) ==========
  categories: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCategories();
    }),
    create: adminProcedure
      .input(zin({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(zin({
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
      .input(zin({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),
  }),

  // ========== Products ==========
  products: router({
    list: adminProcedure.query(async () => {
      return await db.getAllProducts();
    }),
    available: publicProcedure.query(async () => {
      return await db.getAvailableProducts();
    }),
    getById: publicProcedure
      .input(zin({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),
    create: adminProcedure
      .input(zin({
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        price: z.number().int().min(0), // Em centavos, pela unidade de venda
        unit: z.enum(SALE_UNITS).default('kg'),
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
      .input(zin({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        price: z.number().int().min(0).optional(),
        unit: z.enum(SALE_UNITS).optional(),
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
      .input(zin({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProduct(input.id);
        return { success: true };
      }),
    bulkUpdateAvailability: adminProcedure
      .input(zin({
        productIds: z.array(z.number()),
        available: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.bulkUpdateProductAvailability(input.productIds, input.available);
        return { success: true, count: input.productIds.length };
      }),
    uploadImage: adminProcedure
      .input(zin({
        fileName: z.string(),
        fileData: z.string(), // Base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const bytes = base64ToBytes(input.fileData);
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const fileKey = `products/${input.fileName}-${randomSuffix}`;
        
        const { url } = await storagePut(fileKey, bytes, input.mimeType);
        
        return { url, key: fileKey };
      }),
  }),

  // ========== Orders ==========
  orders: router({
    listAll: adminProcedure.query(async () => {
      return await db.getAllOrders();
    }),
    listByCategory: adminProcedure
      .input(zin({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrdersByCategory(input.categoryId);
      }),
    getById: publicProcedure
      .input(zin({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });
        }
        
        const items = await db.getOrderItems(input.id);
        return { order, items };
      }),
    create: publicProcedure
      .input(zin({
        items: z.array(z.object({
          productId: z.number(),
          // Gramas ou peças, conforme a unidade do produto. Os limites por
          // unidade são conferidos abaixo, quando o produto já é conhecido.
          quantity: z.number().int('Quantidade inválida').positive(),
          cutTypeName: z.string().optional(),
        })),
        customerName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        customerPhone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
        notes: z.string().optional(),
        deliveryAddress: z.string().min(10, 'Endereço deve ter pelo menos 10 caracteres'),
        paymentMethod: z.enum(['card', 'pix', 'cash']),
        changeFor: z.number().optional(), // Valor em centavos para troco (apenas para pagamento em dinheiro)
      }))
      .mutation(async ({ input }) => {
        // A loja fechada precisa recusar aqui, não só na tela: o frontend
        // pode estar desatualizado ou ser contornado.
        const status = getStoreStatus(await db.getBusinessHours());
        if (!status.isOpen) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: status.nextOpening
              ? `A loja está fechada no momento. Abrimos ${WEEKDAY_NAMES[status.nextOpening.weekday]} às ${status.nextOpening.time}.`
              : 'A loja está fechada no momento.',
          });
        }

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
          
          const unit = product.unit;
          const min = minQuantity(unit);
          const max = maxQuantity(unit);

          if (item.quantity < min || item.quantity > max) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${product.name}: quantidade deve estar entre ${formatQuantity(min, unit)} e ${formatQuantity(max, unit)}`,
            });
          }

          const subtotal = calcSubtotal(unit, product.price, item.quantity);
          totalAmount += subtotal;
          
          orderItemsData.push({
            orderId: 0, // Será preenchido após criar o pedido
            productId: product.id,
            productName: product.name,
            price: product.price,
            unit,
            quantity: item.quantity,
            subtotal,
            cutTypeName: item.cutTypeName || null,
          });
        }
        
        // Buscar taxa de entrega e adicionar ao total
        const deliveryFee = await db.getDeliveryFee();
        const totalWithDelivery = totalAmount + deliveryFee;
        
        const orderData: InsertOrder = {
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
        
        // O painel admin detecta novos pedidos via orders.countPending (polling
        // a cada 10s, com badge e toast). Não há mais notificação externa.
        console.log(`[Orders] Novo pedido #${orderId} - ${input.customerName} - R$ ${(totalWithDelivery / 100).toFixed(2)}`);
        
        return { success: true, orderId };
      }),
    updateStatus: adminProcedure
      .input(zin({
        id: z.number(),
        status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
      }))
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.id, input.status);
        return { success: true };
      }),
    countPending: adminProcedure.query(async () => {
      return await db.countPendingOrders();
    }),
  }),

  // ========== Cut Types (Tipos de Corte) ==========
  cutTypes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCutTypes();
    }),
    create: adminProcedure
      .input(zin({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCutType(input);
      }),
    update: adminProcedure
      .input(zin({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCutType(id, data);
      }),
    delete: adminProcedure
      .input(zin({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCutType(input.id);
      }),
    // Obter cortes disponíveis para um produto
    getByProduct: publicProcedure
      .input(zin({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductCutTypes(input.productId);
      }),
    // Adicionar corte a um produto
    addToProduct: adminProcedure
      .input(zin({
        productId: z.number(),
        cutTypeId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.addCutTypeToProduct(input.productId, input.cutTypeId);
      }),
    // Remover corte de um produto
    removeFromProduct: adminProcedure
      .input(zin({
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
      .input(zin({
        valueGrams: z.number().min(1),
        label: z.string().min(1),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createQuickQuantity(input);
      }),
    update: adminProcedure
      .input(zin({
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
      .input(zin({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteQuickQuantity(input.id);
      }),
    // Obter quantidades disponíveis para um produto
    getByProduct: publicProcedure
      .input(zin({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductQuickQuantities(input.productId);
      }),
    // Adicionar quantidade a um produto
    addToProduct: adminProcedure
      .input(zin({
        productId: z.number(),
        quickQuantityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.addQuickQuantityToProduct(input.productId, input.quickQuantityId);
      }),
    // Remover quantidade de um produto
    removeFromProduct: adminProcedure
      .input(zin({
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
    // Horário de funcionamento + se a loja está aberta agora.
    // O cálculo é do servidor: o relógio do cliente não é confiável.
    getBusinessHours: publicProcedure.query(async () => {
      const hours = await db.getBusinessHours();
      return { hours, status: getStoreStatus(hours) };
    }),
    setBusinessHours: adminProcedure
      .input(
        zin({
          hours: z
            .array(
              z.object({
                open: z.boolean(),
                from: z.string().refine(isValidTime, 'Horário inválido (use HH:MM)'),
                to: z.string().refine(isValidTime, 'Horário inválido (use HH:MM)'),
              })
            )
            .length(7, 'É preciso informar os sete dias da semana'),
        })
      )
      .mutation(async ({ input }) => {
        const invalido = input.hours.findIndex(day => !isValidDayHours(day));
        if (invalido >= 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `O horário de fechamento deve ser depois do de abertura (${WEEKDAY_NAMES[invalido]})`,
          });
        }

        await db.setBusinessHours(input.hours as BusinessHours);
        return { success: true };
      }),
    setDeliveryFee: adminProcedure
      .input(zin({
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
      .input(zin({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getAdminUserByUsername(input.username);
        
        if (!user || !user.active) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário ou senha inválidos' });
        }
        
        const isValid = await verifyPassword(input.password, user.passwordHash);
        
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário ou senha inválidos' });
        }
        
        // Atualizar último login
        await db.updateAdminLastLogin(user.id);
        
        // Emitir sessão assinada em cookie httpOnly - é ela que autoriza
        // as rotas adminProcedure no servidor.
        const token = await createAdminToken({
          adminId: user.id,
          username: user.username,
          name: user.name,
        });
        ctx.setCookie(buildAdminSessionCookie(token, { secure: ctx.secure }));
        
        // Retornar dados do usuário (sem senha)
        const { passwordHash, ...userData } = user;
        return { user: userData, success: true };
      }),
    
    // Encerra a sessão do painel
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.setCookie(buildAdminLogoutCookie(ctx.secure));
      return { success: true } as const;
    }),
    
    // Sessão atual do admin (null quando não autenticado)
    me: publicProcedure.query(({ ctx }) => ctx.admin),
    
    // Mantido por compatibilidade com telas antigas
    checkAuth: publicProcedure.query(({ ctx }) => {
      return { authenticated: ctx.admin !== null };
    }),
  }),

  adminUsers: router({
    list: adminProcedure.query(async () => {
      const users = await db.listAdminUsers();
      // Remover passwordHash de todos os usuários
      return users.map(({ passwordHash, ...user }) => user);
    }),
    
    create: adminProcedure
      .input(zin({
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
        const passwordHash = await hashPassword(input.password);
        
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
      .input(zin({
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
          updateData.passwordHash = await hashPassword(password);
        }
        
        await db.updateAdminUser(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(zin({ id: z.number() }))
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

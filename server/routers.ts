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
        deliveryDate: z.string(), // ISO string
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
        
        const orderData: InsertOrder = {
          userId: ctx.user?.id || null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          totalAmount,
          notes: input.notes,
          deliveryDate: new Date(input.deliveryDate),
          deliveryAddress: input.deliveryAddress,
        };
        
        const orderId = await db.createOrderWithItems(orderData, orderItemsData);
        
        // Notificar o proprietário sobre novo pedido
        await notifyOwner({
          title: 'Novo Pedido Recebido',
          content: `Pedido #${orderId} de ${input.customerName} (${input.customerPhone}) - Total: R$ ${(totalAmount / 100).toFixed(2)} - Entrega: ${new Date(input.deliveryDate).toLocaleString('pt-BR')}`,
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
});

export type AppRouter = typeof appRouter;

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Schema do Cloudflare D1 (SQLite).
 *
 * Convertido do MySQL. Diferenças que valem lembrar ao mexer aqui:
 *  - datas são inteiros (epoch em segundos); `mode: "timestamp"` devolve Date
 *  - booleanos são inteiros 0/1; `mode: "boolean"` devolve boolean
 *  - não existe ON UPDATE CURRENT_TIMESTAMP: o `$onUpdate` abaixo é aplicado
 *    pelo Drizzle na hora do UPDATE
 *  - SQLite ignora tamanho de VARCHAR, então todo texto vira `text`
 */

const createdAt = () =>
  integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

const updatedAt = () =>
  integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date());

/**
 * Categorias de produtos (ex: Carnes Bovinas, Suínas, Aves, etc.)
 */
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Produtos do açougue (carnes)
 * Preço é armazenado em centavos para evitar problemas de precisão
 */
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: integer("categoryId").references(() => categories.id),
    /**
     * Preço em centavos pela unidade de venda: por quilo quando unit = "kg",
     * por peça quando unit = "un".
     */
    price: integer("price").notNull(),
    /** Como o produto é vendido: a peso (kg) ou por peça (un). */
    unit: text("unit", { enum: ["kg", "un"] })
      .default("kg")
      .notNull(),
    imageUrl: text("imageUrl"),
    imageKey: text("imageKey"), // chave no R2, para gerenciamento
    available: integer("available", { mode: "boolean" }).default(true).notNull(),
    stockKg: integer("stockKg").default(0).notNull(), // Estoque em gramas
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    // a vitrine filtra por disponibilidade; o painel agrupa por categoria
    index("products_available_idx").on(table.available),
    index("products_category_idx").on(table.categoryId),
  ]
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Pedidos realizados pelos clientes (checkout anônimo)
 * Total é armazenado em centavos
 */
export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    status: text("status", {
      enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"],
    })
      .default("pending")
      .notNull(),
    totalAmount: integer("totalAmount").notNull(), // Total em centavos
    notes: text("notes"), // Observações do cliente

    // Identificação do cliente (não há cadastro nem login)
    customerName: text("customerName").notNull(),
    customerPhone: text("customerPhone").notNull(),

    // Entrega
    deliveryDate: integer("deliveryDate", { mode: "timestamp" }),
    /**
     * Endereço montado ("Rua X, 123 - Centro").
     *
     * Continua sendo a fonte para exibir e imprimir: pedidos antigos só têm
     * este campo, e depender das partes exigiria um "se tem, senão" em cada
     * tela e no cupom.
     */
    deliveryAddress: text("deliveryAddress").notNull(),
    /** Partes do endereço. Nulas nos pedidos anteriores à separação. */
    deliveryStreet: text("deliveryStreet"),
    deliveryNumber: text("deliveryNumber"),
    deliveryNeighborhood: text("deliveryNeighborhood"),

    // Pagamento
    paymentMethod: text("paymentMethod", { enum: ["card", "pix", "cash"] })
      .default("cash")
      .notNull(),
    changeFor: integer("changeFor"), // Troco em centavos (só para dinheiro)

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    // o painel conta pendentes a cada 10s e lista os pedidos por data
    index("orders_status_idx").on(table.status),
    index("orders_created_idx").on(table.createdAt),
  ]
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Itens de cada pedido
 * Quantidade é armazenada em gramas (1kg = 1000g)
 */
export const orderItems = sqliteTable(
  "orderItems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    productName: text("productName").notNull(), // Snapshot do nome
    price: integer("price").notNull(), // Snapshot do preço em centavos
    /** Snapshot da unidade: o produto pode mudar depois do pedido feito. */
    unit: text("unit", { enum: ["kg", "un"] })
      .default("kg")
      .notNull(),
    /** Gramas quando unit = "kg"; peças quando unit = "un". */
    quantity: integer("quantity").notNull(),
    subtotal: integer("subtotal").notNull(), // Em centavos
    cutTypeName: text("cutTypeName"), // Tipo de corte escolhido
    createdAt: createdAt(),
  },
  table => [index("orderItems_order_idx").on(table.orderId)]
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Tipos de corte disponíveis (ex: Moído, Em Cubos, Peça Inteira, Bifes)
 */
export const cutTypes = sqliteTable("cutTypes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type CutType = typeof cutTypes.$inferSelect;
export type InsertCutType = typeof cutTypes.$inferInsert;

/**
 * Quais cortes estão disponíveis para cada produto
 */
export const productCutTypes = sqliteTable(
  "productCutTypes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    cutTypeId: integer("cutTypeId")
      .notNull()
      .references(() => cutTypes.id),
    createdAt: createdAt(),
  },
  table => [
    // a mesma associação não pode ser criada duas vezes
    uniqueIndex("productCutTypes_pair_idx").on(table.productId, table.cutTypeId),
  ]
);

export type ProductCutType = typeof productCutTypes.$inferSelect;
export type InsertProductCutType = typeof productCutTypes.$inferInsert;

/**
 * Quantidades rápidas (ex: 500g, 1kg, 2kg)
 * Valor armazenado em gramas para precisão
 */
export const quickQuantities = sqliteTable("quickQuantities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valueGrams: integer("valueGrams").notNull(),
  label: text("label").notNull(), // Ex: "500g", "1kg"
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type QuickQuantity = typeof quickQuantities.$inferSelect;
export type InsertQuickQuantity = typeof quickQuantities.$inferInsert;

/**
 * Quais quantidades rápidas aparecem em cada produto
 */
export const productQuickQuantities = sqliteTable(
  "productQuickQuantities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id),
    quickQuantityId: integer("quickQuantityId")
      .notNull()
      .references(() => quickQuantities.id),
    createdAt: createdAt(),
  },
  table => [
    uniqueIndex("productQuickQuantities_pair_idx").on(
      table.productId,
      table.quickQuantityId
    ),
  ]
);

export type ProductQuickQuantity = typeof productQuickQuantities.$inferSelect;
export type InsertProductQuickQuantity = typeof productQuickQuantities.$inferInsert;

/**
 * Configurações do sistema (taxa de entrega, etc.) em chave-valor
 */
export const systemSettings = sqliteTable("systemSettings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * Fila de impressão dos cupons.
 *
 * O cupom é gravado aqui e o agente de impressão do balcão busca e imprime.
 * Uma fila em vez de impressão direta porque a impressora pode estar sem
 * papel, o PC desligado ou o agente parado: assim o pedido não se perde, sai
 * quando a impressora voltar.
 */
export const printJobs = sqliteTable(
  "printJobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("orderId").references(() => orders.id),
    /** Cupom em texto puro; o agente converte para ESC/POS. */
    content: text("content").notNull(),
    status: text("status", { enum: ["pending", "done", "failed"] })
      .default("pending")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("lastError"),
    createdAt: createdAt(),
    printedAt: integer("printedAt", { mode: "timestamp" }),
  },
  table => [
    // o agente pergunta "tem trabalho?" a cada poucos segundos
    index("printJobs_status_idx").on(table.status, table.id),
  ]
);

export type PrintJob = typeof printJobs.$inferSelect;
export type InsertPrintJob = typeof printJobs.$inferInsert;

/**
 * Usuários do painel administrativo
 * Autenticação própria (usuário/senha), independente de qualquer OAuth
 */
export const adminUsers = sqliteTable("adminUsers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastLoginAt: integer("lastLoginAt", { mode: "timestamp" }),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

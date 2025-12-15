import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categorias de produtos (ex: Carnes Bovinas, Suínas, Aves, etc.)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Produtos do açougue (carnes)
 * Preço é armazenado em centavos para evitar problemas de precisão
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId").references(() => categories.id),
  pricePerKg: int("pricePerKg").notNull(), // Preço em centavos por kg
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"), // S3 key para gerenciamento
  available: boolean("available").default(true).notNull(),
  stockKg: int("stockKg").default(0).notNull(), // Estoque em gramas (1kg = 1000g)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Pedidos realizados pelos clientes
 * Total é armazenado em centavos
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id), // Opcional - null para pedidos anônimos
  status: mysqlEnum("status", ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]).default("pending").notNull(),
  totalAmount: int("totalAmount").notNull(), // Total em centavos
  notes: text("notes"), // Observações do cliente
  
  // Informações do cliente (para pedidos anônimos)
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  
  // Informações de entrega
  deliveryDate: timestamp("deliveryDate"), // Data e hora agendada para entrega
  deliveryAddress: text("deliveryAddress").notNull(), // Endereço completo informado pelo cliente
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Itens de cada pedido
 * Quantidade é armazenada em gramas (1kg = 1000g)
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  productId: int("productId").notNull().references(() => products.id),
  productName: varchar("productName", { length: 200 }).notNull(), // Snapshot do nome
  pricePerKg: int("pricePerKg").notNull(), // Snapshot do preço em centavos
  quantityGrams: int("quantityGrams").notNull(), // Quantidade em gramas
  subtotal: int("subtotal").notNull(), // Subtotal em centavos
  cutTypeName: varchar("cutTypeName", { length: 100 }), // Tipo de corte selecionado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Endereços de entrega dos clientes
 */
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  label: varchar("label", { length: 100 }), // Ex: "Casa", "Trabalho"
  street: varchar("street", { length: 255 }).notNull(),
  number: varchar("number", { length: 20 }).notNull(),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(), // UF
  zipCode: varchar("zipCode", { length: 10 }).notNull(), // CEP
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

/**
 * Tipos de corte disponíveis (ex: Moído, Em Cubos, Peça Inteira, Bifes, etc.)
 */
export const cutTypes = mysqlTable("cutTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CutType = typeof cutTypes.$inferSelect;
export type InsertCutType = typeof cutTypes.$inferInsert;

/**
 * Relação muitos-para-muitos entre produtos e tipos de corte
 * Define quais cortes estão disponíveis para cada produto
 */
export const productCutTypes = mysqlTable("productCutTypes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  cutTypeId: int("cutTypeId").notNull().references(() => cutTypes.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductCutType = typeof productCutTypes.$inferSelect;
export type InsertProductCutType = typeof productCutTypes.$inferInsert;


/**
 * Quantidades rápidas disponíveis (ex: 0.5kg, 1kg, 1.5kg, 2kg, 3kg, etc.)
 * Valor armazenado em gramas para precisão
 */
export const quickQuantities = mysqlTable("quickQuantities", {
  id: int("id").autoincrement().primaryKey(),
  valueGrams: int("valueGrams").notNull(), // Valor em gramas (ex: 500 = 0.5kg)
  label: varchar("label", { length: 50 }).notNull(), // Label de exibição (ex: "0.5kg", "500g")
  sortOrder: int("sortOrder").default(0).notNull(), // Ordem de exibição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuickQuantity = typeof quickQuantities.$inferSelect;
export type InsertQuickQuantity = typeof quickQuantities.$inferInsert;

/**
 * Relação muitos-para-muitos entre produtos e quantidades rápidas
 * Define quais quantidades estão disponíveis para cada produto
 */
export const productQuickQuantities = mysqlTable("productQuickQuantities", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  quickQuantityId: int("quickQuantityId").notNull().references(() => quickQuantities.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductQuickQuantity = typeof productQuickQuantities.$inferSelect;
export type InsertProductQuickQuantity = typeof productQuickQuantities.$inferInsert;

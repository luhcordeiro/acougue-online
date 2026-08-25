import { eq, desc, and, inArray, getTableColumns } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  type BusinessHours,
} from "@shared/businessHours";
import { categories, InsertCategory, products, InsertProduct, orders, InsertOrder, orderItems, InsertOrderItem, cutTypes, InsertCutType, productCutTypes, quickQuantities, InsertQuickQuantity, productQuickQuantities, systemSettings, adminUsers, InsertAdminUser, AdminUser } from "../drizzle/schema";

/**
 * O driver é injetado pelo entrypoint (worker/index.ts), que liga o Drizzle
 * ao binding D1 daquela requisição. Os testes injetam um SQLite local.
 */
type Database = BaseSQLiteDatabase<any, any, any, any>;

let _db: Database | null = null;

export function setDb(db: Database | null): void {
  _db = db;
}

export async function getDb(): Promise<Database | null> {
  return _db;
}



// ========== Categories ==========

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(data);
  return result;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ========== Products ==========

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getAvailableProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.available, true)).orderBy(products.name);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(products).values(data).returning({ id: products.id });
  return { insertId: row.id };
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
}

export async function bulkUpdateProductAvailability(productIds: number[], available: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (productIds.length === 0) return;
  await db.update(products).set({ available }).where(inArray(products.id, productIds));
}

// ========== Orders ==========

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar pedidos que contenham produtos da categoria especificada
  const ordersWithCategory = await db
    .selectDistinct(getTableColumns(orders))
    .from(orders)
    .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(products.categoryId, categoryId))
    .orderBy(desc(orders.createdAt));
  
  return ordersWithCategory;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(data);
  return result;
}

export async function updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

export async function countPendingOrders() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(orders).where(eq(orders.status, 'pending'));
  return result.length;
}

// ========== Order Items ==========

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function createOrderItem(data: InsertOrderItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orderItems).values(data);
  return result;
}

export async function createOrderWithItems(orderData: InsertOrder, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Inserir o pedido
  const [order] = await db.insert(orders).values(orderData).returning({ id: orders.id });
  const orderId = order.id;
  
  // Inserir os itens do pedido
  const itemsWithOrderId = items.map(item => ({
    ...item,
    orderId,
  }));
  
  if (itemsWithOrderId.length > 0) {
    await db.insert(orderItems).values(itemsWithOrderId);
  }
  
  return orderId;
}

// ========================================
// CUT TYPES (Tipos de Corte)
// ========================================

export async function getAllCutTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(cutTypes).orderBy(cutTypes.name);
}

export async function getCutTypeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(cutTypes).where(eq(cutTypes.id, id)).limit(1);
  return result[0] || null;
}

export async function createCutType(data: InsertCutType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [row] = await db.insert(cutTypes).values(data).returning({ id: cutTypes.id });
  return { success: true, cutTypeId: row.id };
}

export async function updateCutType(id: number, data: Partial<InsertCutType>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(cutTypes).set(data).where(eq(cutTypes.id, id));
  return { success: true };
}

export async function deleteCutType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Primeiro, remover associações com produtos
  await db.delete(productCutTypes).where(eq(productCutTypes.cutTypeId, id));
  
  // Depois, deletar o tipo de corte
  await db.delete(cutTypes).where(eq(cutTypes.id, id));
  return { success: true };
}

// ========================================
// PRODUCT CUT TYPES (Relação Produto-Corte)
// ========================================

export async function getProductCutTypes(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      id: cutTypes.id,
      name: cutTypes.name,
      description: cutTypes.description,
    })
    .from(productCutTypes)
    .innerJoin(cutTypes, eq(productCutTypes.cutTypeId, cutTypes.id))
    .where(eq(productCutTypes.productId, productId));
  
  return result;
}

export async function addCutTypeToProduct(productId: number, cutTypeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe
  const existing = await db
    .select()
    .from(productCutTypes)
    .where(and(
      eq(productCutTypes.productId, productId),
      eq(productCutTypes.cutTypeId, cutTypeId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return { success: true, message: "Corte já associado ao produto" };
  }
  
  await db.insert(productCutTypes).values({ productId, cutTypeId });
  return { success: true };
}

export async function removeCutTypeFromProduct(productId: number, cutTypeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(productCutTypes)
    .where(and(
      eq(productCutTypes.productId, productId),
      eq(productCutTypes.cutTypeId, cutTypeId)
    ));
  
  return { success: true };
}


// ========================================
// QUICK QUANTITIES (Quantidades Rápidas)
// ========================================

export async function getAllQuickQuantities() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(quickQuantities).orderBy(quickQuantities.sortOrder, quickQuantities.valueGrams);
}

export async function getQuickQuantityById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quickQuantities).where(eq(quickQuantities.id, id)).limit(1);
  return result[0] || null;
}

export async function createQuickQuantity(data: InsertQuickQuantity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [row] = await db.insert(quickQuantities).values(data).returning({ id: quickQuantities.id });
  return { success: true, quickQuantityId: row.id };
}

export async function updateQuickQuantity(id: number, data: Partial<InsertQuickQuantity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(quickQuantities).set(data).where(eq(quickQuantities.id, id));
  return { success: true };
}

export async function deleteQuickQuantity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Primeiro, remover associações com produtos
  await db.delete(productQuickQuantities).where(eq(productQuickQuantities.quickQuantityId, id));
  
  // Depois, deletar a quantidade rápida
  await db.delete(quickQuantities).where(eq(quickQuantities.id, id));
  return { success: true };
}

// ========================================
// PRODUCT QUICK QUANTITIES (Relação Produto-Quantidade)
// ========================================

export async function getProductQuickQuantities(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      id: quickQuantities.id,
      valueGrams: quickQuantities.valueGrams,
      label: quickQuantities.label,
      sortOrder: quickQuantities.sortOrder,
    })
    .from(productQuickQuantities)
    .innerJoin(quickQuantities, eq(productQuickQuantities.quickQuantityId, quickQuantities.id))
    .where(eq(productQuickQuantities.productId, productId))
    .orderBy(quickQuantities.sortOrder, quickQuantities.valueGrams);
  
  return result;
}

export async function addQuickQuantityToProduct(productId: number, quickQuantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe
  const existing = await db
    .select()
    .from(productQuickQuantities)
    .where(and(
      eq(productQuickQuantities.productId, productId),
      eq(productQuickQuantities.quickQuantityId, quickQuantityId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return { success: true, message: "Quantidade já associada ao produto" };
  }
  
  await db.insert(productQuickQuantities).values({ productId, quickQuantityId });
  return { success: true };
}

export async function removeQuickQuantityFromProduct(productId: number, quickQuantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(productQuickQuantities)
    .where(and(
      eq(productQuickQuantities.productId, productId),
      eq(productQuickQuantities.quickQuantityId, quickQuantityId)
    ));
  
  return { success: true };
}


// ==================== SYSTEM SETTINGS ====================

export async function getSystemSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSystemSetting(key: string, value: string, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  
  if (existing.length > 0) {
    await db.update(systemSettings).set({ value, description }).where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value, description });
  }
}

export async function getAllSystemSettings(): Promise<{ key: string; value: string; description: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    key: systemSettings.key,
    value: systemSettings.value,
    description: systemSettings.description,
  }).from(systemSettings);
  
  return result;
}

const BUSINESS_HOURS_KEY = "business_hours";

export async function getBusinessHours(): Promise<BusinessHours> {
  const raw = await getSystemSetting(BUSINESS_HOURS_KEY);
  if (!raw) return DEFAULT_BUSINESS_HOURS;

  try {
    return normalizeBusinessHours(JSON.parse(raw));
  } catch (error) {
    // Valor corrompido não pode derrubar a loja: cai no padrão.
    console.warn("[Settings] business_hours inválido, usando padrão:", error);
    return DEFAULT_BUSINESS_HOURS;
  }
}

export async function setBusinessHours(hours: BusinessHours): Promise<void> {
  await setSystemSetting(
    BUSINESS_HOURS_KEY,
    JSON.stringify(hours),
    "Horário de funcionamento por dia da semana"
  );
}

export async function getDeliveryFee(): Promise<number> {
  const fee = await getSystemSetting("delivery_fee");
  return fee ? parseInt(fee) : 0; // Retorna em centavos, default 0
}

export async function setDeliveryFee(feeInCents: number): Promise<void> {
  await setSystemSetting("delivery_fee", feeInCents.toString(), "Taxa de entrega em centavos");
}


// ==================== ADMIN USERS ====================

export async function createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [newUser] = await db.insert(adminUsers).values(data).returning();
  return newUser;
}

export async function getAdminUserByUsername(username: string): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
}

export async function updateAdminUser(id: number, data: Partial<InsertAdminUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(adminUsers).set(data).where(eq(adminUsers.id, id));
}

export async function deleteAdminUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}

export async function updateAdminLastLogin(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
}

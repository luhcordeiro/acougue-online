import { eq, desc, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, InsertCategory, products, InsertProduct, orders, InsertOrder, orderItems, InsertOrderItem, addresses, InsertAddress, cutTypes, InsertCutType, productCutTypes, InsertProductCutType, quickQuantities, InsertQuickQuantity, productQuickQuantities, InsertProductQuickQuantity, systemSettings, InsertSystemSetting, adminUsers, InsertAdminUser, AdminUser } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
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
  const result = await db.insert(products).values(data);
  // Buscar o último produto inserido para obter o id
  const [lastProduct] = await db.select({ id: products.id }).from(products).orderBy(desc(products.id)).limit(1);
  return { ...result, insertId: lastProduct?.id };
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

export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar pedidos que contenham produtos da categoria especificada
  const ordersWithCategory = await db
    .selectDistinct({ 
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      deliveryDate: orders.deliveryDate,
      deliveryAddress: orders.deliveryAddress,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
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
  const orderResult = await db.insert(orders).values(orderData);
  const orderId = Number(orderResult[0].insertId);
  
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

// ============================================
// ADDRESS MANAGEMENT
// ============================================

export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function getAddressById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function createAddress(data: InsertAddress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Se este endereço for marcado como padrão, desmarcar outros
  if (data.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, data.userId));
  }
  
  const result = await db.insert(addresses).values(data);
  return { success: true, addressId: Number(result[0].insertId) };
}

export async function updateAddress(id: number, userId: number, data: Partial<InsertAddress>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Se este endereço for marcado como padrão, desmarcar outros
  if (data.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
  }
  
  await db
    .update(addresses)
    .set(data)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  
  return { success: true };
}

export async function deleteAddress(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  
  return { success: true };
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
  
  const result = await db.insert(cutTypes).values(data);
  return { success: true, cutTypeId: Number(result[0].insertId) };
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
  
  const result = await db.insert(quickQuantities).values(data);
  return { success: true, quickQuantityId: Number(result[0].insertId) };
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
  
  const result = await db.insert(adminUsers).values(data);
  const newUser = await db.select().from(adminUsers).where(eq(adminUsers.id, Number(result[0].insertId))).limit(1);
  return newUser[0];
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

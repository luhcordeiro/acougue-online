import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, InsertCategory, products, InsertProduct, orders, InsertOrder, orderItems, InsertOrderItem, addresses, InsertAddress } from "../drizzle/schema";
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
  return result;
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

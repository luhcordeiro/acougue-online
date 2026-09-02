import { eq, desc, and, inArray, getTableColumns } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { DEFAULT_QUICK_QUANTITIES } from "@shared/quantity";
import {
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  type BusinessHours,
} from "@shared/businessHours";
import { categories, InsertCategory, products, InsertProduct, orders, InsertOrder, orderItems, InsertOrderItem, cutTypes, InsertCutType, productCutTypes, quickQuantities, InsertQuickQuantity, productQuickQuantities, systemSettings, printJobs, adminUsers, InsertAdminUser, AdminUser } from "../drizzle/schema";

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

export type OrderFilters = {
  status?: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  categoryId?: number;
};

/**
 * Monta o filtro de pedidos.
 *
 * Filtrar por categoria exige juntar com os itens, porque a categoria é do
 * produto, não do pedido. O selectDistinct evita repetir o pedido que tem
 * vários itens da mesma categoria.
 */
function ordersQuery(db: Database, { status, categoryId }: OrderFilters) {
  const base = categoryId
    ? db
        .selectDistinct(getTableColumns(orders))
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .$dynamic()
    : db.select(getTableColumns(orders)).from(orders).$dynamic();

  const filtros = [
    categoryId ? eq(products.categoryId, categoryId) : undefined,
    status ? eq(orders.status, status) : undefined,
  ].filter(Boolean);

  return filtros.length > 0 ? base.where(and(...(filtros as any))) : base;
}

/** Página de pedidos, do mais novo para o mais antigo. */
export async function listOrders(
  filters: OrderFilters & { limit: number; offset: number }
) {
  const db = await getDb();
  if (!db) return [];

  const { limit, offset, ...rest } = filters;

  return await ordersQuery(db, rest)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit)
    .offset(offset);
}

/** Total com os mesmos filtros, para o paginador saber quantas páginas há. */
export async function countOrders(filters: OrderFilters): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // sem paginação: só as linhas que casam, contadas em memória
  const linhas = await ordersQuery(db, filters);
  return linhas.length;
}

/** Info leve para o painel detectar pedido novo sem baixar a lista toda. */
export async function getOrdersSummary(): Promise<{
  lastOrderId: number;
  pendingCount: number;
}> {
  const db = await getDb();
  if (!db) return { lastOrderId: 0, pendingCount: 0 };

  const [ultimo] = await db
    .select({ id: orders.id })
    .from(orders)
    .orderBy(desc(orders.id))
    .limit(1);

  const pendentes = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.status, "pending"));

  return { lastOrderId: ultimo?.id ?? 0, pendingCount: pendentes.length };
}

/**
 * Apaga pedidos e seus itens.
 *
 * Os itens saem primeiro por causa da foreign key: o SQLite recusaria apagar
 * o pedido ainda referenciado.
 */
export async function deleteOrders(ids: number[]): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return 0;

  await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
  await db.delete(orders).where(inArray(orders.id, ids));

  return ids.length;
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

/**
 * Teto de parâmetros ligados por consulta no D1.
 *
 * Cada item do pedido ocupa um parâmetro por coluna, e um INSERT único com
 * todos os itens estoura esse teto: com as colunas de hoje, a partir de 13
 * itens. Era o que derrubava pedido grande com "too many SQL variables" —
 * e, pior, deixava o pedido gravado sem nenhum item.
 */
const MAX_PARAMETROS_POR_CONSULTA = 100;

/**
 * Divide os itens em lotes que caibam no teto de parâmetros.
 *
 * O tamanho do lote sai do número real de colunas em vez de ser fixo: assim
 * acrescentar uma coluna em orderItems reduz o lote sozinho, em vez de voltar
 * a quebrar só em pedido grande, que é onde ninguém testa.
 */
function emLotes<T extends object>(itens: T[]): T[][] {
  // o Drizzle monta um INSERT só, com a união das colunas de todas as linhas,
  // então quem manda é a linha mais larga
  const colunas = Math.max(1, ...itens.map(item => Object.keys(item).length));
  const porLote = Math.max(1, Math.floor(MAX_PARAMETROS_POR_CONSULTA / colunas));

  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += porLote) {
    lotes.push(itens.slice(i, i + porLote));
  }
  return lotes;
}

export async function createOrderWithItems(orderData: InsertOrder, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db.insert(orders).values(orderData).returning({ id: orders.id });
  const orderId = order.id;

  const itemsWithOrderId = items.map(item => ({ ...item, orderId }));

  if (itemsWithOrderId.length === 0) return orderId;

  try {
    for (const lote of emLotes(itemsWithOrderId)) {
      await db.insert(orderItems).values(lote);
    }
  } catch (erro) {
    // Pedido sem itens é pior que pedido nenhum: ele aparece no painel, sai na
    // impressão e vira mensagem de R$ 0,00 para o cliente, sem ninguém
    // descobrir o que ele queria. Desfazendo, o cliente vê o erro e refaz.
    // Os itens saem primeiro: a chave estrangeira impede apagar o pedido antes.
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
    throw erro;
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

const HERO_IMAGE_URL_KEY = "hero_image_url";
const HERO_IMAGE_KEY_KEY = "hero_image_key";

/** Foto da fachada exibida como fundo da home. */
export async function getHeroImage(): Promise<{ url: string | null; key: string | null }> {
  return {
    url: await getSystemSetting(HERO_IMAGE_URL_KEY),
    key: await getSystemSetting(HERO_IMAGE_KEY_KEY),
  };
}

export async function setHeroImage(url: string, key: string): Promise<void> {
  await setSystemSetting(HERO_IMAGE_URL_KEY, url, "URL da foto da fachada");
  await setSystemSetting(HERO_IMAGE_KEY_KEY, key, "Chave da foto da fachada no R2");
}

export async function clearHeroImage(): Promise<void> {
  await setSystemSetting(HERO_IMAGE_URL_KEY, "", "URL da foto da fachada");
  await setSystemSetting(HERO_IMAGE_KEY_KEY, "", "Chave da foto da fachada no R2");
}

const STORE_NAME_KEY = "store_name";

/** Nome impresso no topo do cupom. */
export async function getStoreName(): Promise<string> {
  return (await getSystemSetting(STORE_NAME_KEY)) || "Acougue Online";
}

export async function setStoreName(name: string): Promise<void> {
  await setSystemSetting(STORE_NAME_KEY, name, "Nome exibido no cupom");
}

const CHECKOUT_SETTINGS_KEY = "checkout_settings";

export type CheckoutSettings = {
  /**
   * Deixa o cliente digitar qualquer peso nos produtos vendidos a quilo.
   *
   * Desligado, ele escolhe entre as quantidades rápidas cadastradas — o que
   * o açougue pede quando quer preparar pacotes padronizados. Produto vendido
   * por peça sempre aceita escolher a quantidade, que ali é contagem.
   */
  allowFreeQuantity: boolean;
  /**
   * Valor mínimo do pedido, em centavos, contando só os produtos.
   *
   * A taxa de entrega fica de fora: ela é custo do serviço, e somá-la deixaria
   * o cliente atingir o mínimo sem levar mais mercadoria — o oposto do que a
   * regra existe para fazer. Zero desliga a exigência.
   */
  minOrderAmount: number;
};

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  allowFreeQuantity: false,
  minOrderAmount: 3000, // R$ 30,00
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const raw = await getSystemSetting(CHECKOUT_SETTINGS_KEY);
  if (!raw) return DEFAULT_CHECKOUT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutSettings>;
    return {
      allowFreeQuantity:
        parsed.allowFreeQuantity ?? DEFAULT_CHECKOUT_SETTINGS.allowFreeQuantity,
      minOrderAmount:
        typeof parsed.minOrderAmount === "number" && parsed.minOrderAmount >= 0
          ? parsed.minOrderAmount
          : DEFAULT_CHECKOUT_SETTINGS.minOrderAmount,
    };
  } catch (error) {
    console.warn("[Settings] checkout_settings inválido, usando padrão:", error);
    return DEFAULT_CHECKOUT_SETTINGS;
  }
}

export async function setCheckoutSettings(settings: CheckoutSettings): Promise<void> {
  await setSystemSetting(
    CHECKOUT_SETTINGS_KEY,
    JSON.stringify(settings),
    "Regras do checkout"
  );
}

/**
 * Quantidades que o cliente pode escolher para um produto a quilo.
 *
 * Segue a mesma regra da vitrine: as do produto, se houver; senão todas as
 * cadastradas; e se não houver nenhuma, um conjunto padrão — sem ele o
 * açougue ficaria impedido de vender até cadastrar quantidades.
 */
export async function getAllowedQuantities(productId: number): Promise<number[]> {
  const doProduto = await getProductQuickQuantities(productId);
  if (doProduto.length > 0) return doProduto.map(q => q.valueGrams);

  const todas = await getAllQuickQuantities();
  if (todas.length > 0) return todas.map(q => q.valueGrams);

  return [...DEFAULT_QUICK_QUANTITIES];
}

const ORDER_ALERTS_KEY = "order_alerts";

export type OrderAlerts = {
  /** Toca som e mostra aviso quando entra pedido novo. */
  notify: boolean;
  /** Manda o cupom para a impressora sozinho. */
  autoPrint: boolean;
  /** Largura da bobina da impressora térmica. */
  receiptWidth: "58mm" | "80mm";
};

export const DEFAULT_ORDER_ALERTS: OrderAlerts = {
  notify: true,
  autoPrint: false,
  receiptWidth: "80mm",
};

export async function getOrderAlerts(): Promise<OrderAlerts> {
  const raw = await getSystemSetting(ORDER_ALERTS_KEY);
  if (!raw) return DEFAULT_ORDER_ALERTS;

  try {
    const parsed = JSON.parse(raw) as Partial<OrderAlerts>;
    return {
      notify: parsed.notify ?? DEFAULT_ORDER_ALERTS.notify,
      autoPrint: parsed.autoPrint ?? DEFAULT_ORDER_ALERTS.autoPrint,
      receiptWidth:
        parsed.receiptWidth === "58mm" ? "58mm" : DEFAULT_ORDER_ALERTS.receiptWidth,
    };
  } catch (error) {
    // valor corrompido não pode derrubar o painel
    console.warn("[Settings] order_alerts inválido, usando padrão:", error);
    return DEFAULT_ORDER_ALERTS;
  }
}

export async function setOrderAlerts(alerts: OrderAlerts): Promise<void> {
  await setSystemSetting(
    ORDER_ALERTS_KEY,
    JSON.stringify(alerts),
    "Notificação e impressão automática de novos pedidos"
  );
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


// ==================== FILA DE IMPRESSAO ====================

export async function enqueuePrintJob(
  orderId: number | null,
  content: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [row] = await db
    .insert(printJobs)
    .values({ orderId, content })
    .returning({ id: printJobs.id });

  return row.id;
}

/** Próximos cupons a imprimir, do mais antigo para o mais novo. */
export async function nextPrintJobs(limit = 5) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.status, "pending"))
    .orderBy(printJobs.id)
    .limit(limit);
}

export async function markPrintJobDone(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(printJobs)
    .set({ status: "done", printedAt: new Date() })
    .where(eq(printJobs.id, id));
}

/**
 * Registra a falha e devolve o cupom para a fila até certo limite.
 *
 * Sem o teto, um cupom que a impressora nunca aceita ficaria travando a fila
 * para sempre e nenhum pedido seguinte sairia.
 */
export async function markPrintJobFailed(
  id: number,
  error: string,
  maxAttempts = 5
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1);
  if (!job) return;

  const attempts = job.attempts + 1;

  await db
    .update(printJobs)
    .set({
      attempts,
      lastError: error.slice(0, 500),
      status: attempts >= maxAttempts ? "failed" : "pending",
    })
    .where(eq(printJobs.id, id));
}

/** Situação da fila, para o painel mostrar quando algo travou. */
export async function getPrintQueueStatus(): Promise<{
  pending: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, failed: 0 };

  const linhas = await db
    .select({ status: printJobs.status })
    .from(printJobs)
    .where(inArray(printJobs.status, ["pending", "failed"]));

  return {
    pending: linhas.filter(l => l.status === "pending").length,
    failed: linhas.filter(l => l.status === "failed").length,
  };
}

export async function retryFailedPrintJobs(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const falhos = await db
    .select({ id: printJobs.id })
    .from(printJobs)
    .where(eq(printJobs.status, "failed"));

  if (falhos.length === 0) return 0;

  await db
    .update(printJobs)
    .set({ status: "pending", attempts: 0, lastError: null })
    .where(eq(printJobs.status, "failed"));

  return falhos.length;
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

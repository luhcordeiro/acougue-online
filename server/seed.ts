import { eq } from "drizzle-orm";
import seedData from "../drizzle/seed-data.json";
import {
  categories,
  cutTypes,
  products,
  quickQuantities,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword } from "./_core/password";
import { adminUsers } from "../drizzle/schema";

/**
 * Popula o catálogo inicial. Idempotente: só age em tabela vazia, então rodar
 * de novo não duplica nada.
 *
 * Mesma fonte de dados usada pelo seed de produção (scripts/seed-sql.mjs),
 * para os testes exercitarem exatamente o catálogo que vai para o ar.
 */
export async function seedCatalog(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) return;

  const categoryIds = new Map<string, number>();

  for (const category of seedData.categories) {
    const [row] = await db
      .insert(categories)
      .values({ name: category.name, description: category.description })
      .returning({ id: categories.id });
    categoryIds.set(category.name, row.id);
  }

  for (const product of seedData.products) {
    await db.insert(products).values({
      name: product.name,
      description: product.description,
      categoryId: categoryIds.get(product.category),
      pricePerKg: product.pricePerKg,
      stockKg: product.stockKg,
      available: true,
    });
  }

  for (const cut of seedData.cutTypes) {
    await db.insert(cutTypes).values({ name: cut.name, description: cut.description });
  }

  for (const quantity of seedData.quickQuantities) {
    await db.insert(quickQuantities).values({
      valueGrams: quantity.valueGrams,
      label: quantity.label,
      sortOrder: quantity.sortOrder,
    });
  }
}

/**
 * Garante que exista um usuário do painel. Não sobrescreve senha de usuário
 * já existente — trocar senha é operação do painel, não do seed.
 */
export async function ensureAdminUser(
  username: string,
  password: string,
  name = "Administrador"
): Promise<{ created: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (existing.length > 0) return { created: false };

  await db.insert(adminUsers).values({
    username,
    passwordHash: await hashPassword(password),
    name,
    active: true,
  });

  return { created: true };
}

/**
 * Gera o SQL de seed para o Cloudflare D1.
 *
 * Usa a mesma fonte de dados dos testes (drizzle/seed-data.json), então o
 * catálogo que vai para produção é exatamente o que os testes exercitam.
 *
 * Uso:
 *   node scripts/seed-sql.mjs > seed.generated.sql
 *   npx wrangler d1 execute acougue-online --local  --file=seed.generated.sql
 *   npx wrangler d1 execute acougue-online --remote --file=seed.generated.sql
 *
 * A senha do admin vem de ADMIN_PASSWORD (padrão: admin123, para trocar no
 * primeiro acesso). O arquivo gerado contém o hash — não commite.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, "..", "drizzle", "seed-data.json"), "utf-8")
);

const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Administrador";

/** Mesmo formato de server/_core/password.ts: pbkdf2$<iter>$<salt>$<hash> */
async function hashPassword(password) {
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );

  const b64 = bytes => Buffer.from(bytes).toString("base64");
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

const quote = value =>
  value === null || value === undefined
    ? "NULL"
    : `'${String(value).replace(/'/g, "''")}'`;

const lines = [];
lines.push("-- Gerado por scripts/seed-sql.mjs - nao editar a mao");
lines.push("-- Idempotente: nada e inserido se ja existir registro equivalente");
lines.push("");

for (const c of data.categories) {
  lines.push(
    `INSERT INTO categories (name, description) SELECT ${quote(c.name)}, ${quote(c.description)} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ${quote(c.name)});`
  );
}
lines.push("");

for (const p of data.products) {
  lines.push(
    `INSERT INTO products (name, description, categoryId, price, unit, stockKg, available) ` +
      `SELECT ${quote(p.name)}, ${quote(p.description)}, ` +
      `(SELECT id FROM categories WHERE name = ${quote(p.category)}), ${p.price}, ${quote(p.unit ?? "kg")}, ${p.stockKg}, 1 ` +
      `WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${quote(p.name)});`
  );
}
lines.push("");

for (const c of data.cutTypes) {
  lines.push(
    `INSERT INTO cutTypes (name, description) SELECT ${quote(c.name)}, ${quote(c.description)} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM cutTypes WHERE name = ${quote(c.name)});`
  );
}
lines.push("");

for (const q of data.quickQuantities) {
  lines.push(
    `INSERT INTO quickQuantities (valueGrams, label, sortOrder) ` +
      `SELECT ${q.valueGrams}, ${quote(q.label)}, ${q.sortOrder} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM quickQuantities WHERE valueGrams = ${q.valueGrams});`
  );
}
lines.push("");

const passwordHash = await hashPassword(ADMIN_PASS);
lines.push(
  `INSERT INTO adminUsers (username, passwordHash, name, active) ` +
    `SELECT ${quote(ADMIN_USER)}, ${quote(passwordHash)}, ${quote(ADMIN_NAME)}, 1 ` +
    `WHERE NOT EXISTS (SELECT 1 FROM adminUsers WHERE username = ${quote(ADMIN_USER)});`
);

process.stdout.write(lines.join("\n") + "\n");

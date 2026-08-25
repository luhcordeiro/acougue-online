import { defineConfig } from "drizzle-kit";

/**
 * Gera as migrações do Cloudflare D1 (SQLite).
 *
 * Só `generate` roda por aqui: quem aplica é o
 * `wrangler d1 migrations apply`, que conhece o D1 local e o remoto.
 */
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
});

import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll } from "vitest";
import { setDb } from "./db";
import { ensureAdminUser, seedCatalog } from "./seed";
import { setEnv } from "./_core/env";

// DB/BUCKET/ASSETS vêm de worker-configuration.d.ts (gerado por `wrangler types`).
// TEST_MIGRATIONS só existe nos testes, injetado pelo vitest.config.
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

/**
 * Prepara o mesmo ambiente que o worker monta a cada requisição:
 * schema aplicado, driver do D1 injetado e variáveis disponíveis.
 */
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

  setEnv({
    JWT_SECRET: "segredo-de-teste-nao-usar-em-producao",
    R2_PUBLIC_URL: "https://imagens.teste.local",
  });

  setDb(drizzle(env.DB));

  // mesmo catálogo que vai para produção: os testes exercitam dados reais
  await seedCatalog();
  await ensureAdminUser("admin", "admin123");
});

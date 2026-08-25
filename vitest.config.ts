import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Os testes rodam dentro do workerd (mesmo runtime da produção), com um D1
 * local de verdade. O que passa aqui é o que roda no Cloudflare — sem
 * emulação de banco nem driver diferente do de produção.
 */
const migrations = await readD1Migrations(
  path.join(import.meta.dirname, "drizzle", "migrations")
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // banco isolado dos dados de desenvolvimento
        d1Databases: { DB: "test-db" },
        // o setup aplica estas migrações antes dos testes
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    setupFiles: ["./server/test-setup.ts"],
  },
});

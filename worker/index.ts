/**
 * Entrypoint do Cloudflare Workers.
 *
 * Diferenças em relação ao servidor Node (server/_core/index.ts):
 *  - não há Express: o tRPC é servido pelo adaptador fetch
 *  - não há TCP: o banco é acessado pelo driver HTTP do TiDB
 *  - os estáticos são servidos pelo binding ASSETS (Workers Assets)
 *  - as variáveis chegam em `env` por requisição, não em process.env
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { drizzle } from "drizzle-orm/d1";
import { setDb } from "../server/db";
import { setStorage } from "../server/storage";
import { createContextFrom } from "../server/_core/context";
import { setEnv } from "../server/_core/env";
import { appRouter } from "../server/routers";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Banco de dados (Cloudflare D1). */
  DB: D1Database;
  /** Bucket das imagens de produto (binding nativo, sem credenciais). */
  BUCKET: R2Bucket;

  JWT_SECRET: string;
  /** Domínio público do bucket, usado para montar a URL das imagens. */
  R2_PUBLIC_URL?: string;
}

/**
 * Liga o Drizzle ao binding D1 desta requisição.
 *
 * O binding não pode ser guardado entre requisições: cada uma recebe o seu.
 * Como o D1 é local ao data center do Worker, não há custo de conexão.
 */
function ensureDatabase(env: Env) {
  setDb(drizzle(env.DB));
}

/**
 * Storage via binding nativo de R2. O SDK da AWS não roda aqui: ele depende
 * de DOMParser, que não existe no runtime do Workers.
 */
function ensureStorage(env: Env) {
  if (!env.BUCKET) {
    setStorage(null);
    return;
  }

  setStorage({
    async put(key, data, contentType) {
      await env.BUCKET.put(key, data, {
        httpMetadata: { contentType },
      });
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    setEnv(env as unknown as Record<string, string | undefined>);
    ensureDatabase(env);
    ensureStorage(env);

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/trpc")) {
      const cookies: string[] = [];

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: async () => {
          const ctx = await createContextFrom({
            cookieHeader: request.headers.get("cookie"),
            // atrás da borda do Cloudflare o tráfego público é sempre HTTPS
            secure: url.protocol === "https:",
          });
          // guarda a referência para transferir os cookies à resposta
          ctx.setCookie = serialized => cookies.push(serialized);
          return ctx;
        },
      });

      if (cookies.length === 0) return response;

      // Set-Cookie precisa de append: um header por cookie
      const headers = new Headers(response.headers);
      for (const cookie of cookies) headers.append("set-cookie", cookie);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // SPA: qualquer outra rota cai nos assets (com fallback para index.html)
    return env.ASSETS.fetch(request);
  },
};

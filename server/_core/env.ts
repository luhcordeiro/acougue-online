/**
 * Acesso a variáveis de ambiente que funciona nos dois runtimes.
 *
 * No Node elas vêm de process.env. No Cloudflare Workers não existe
 * process.env: os valores chegam no objeto `env` de cada requisição, então o
 * worker chama setEnv() antes de tratar o pedido.
 *
 * Os campos são getters de propósito: ler em tempo de módulo capturaria os
 * valores antes de setEnv() rodar e o Worker veria tudo vazio.
 */

type EnvBag = Record<string, string | undefined>;

let injected: EnvBag | null = null;

export function setEnv(bag: EnvBag): void {
  injected = bag;
}

function read(key: string): string {
  const fromInjected = injected?.[key];
  if (fromInjected !== undefined) return fromInjected;

  if (typeof process !== "undefined" && process.env) {
    return process.env[key] ?? "";
  }

  return "";
}

export const ENV = {
  get cookieSecret() {
    return read("JWT_SECRET");
  },
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  get isProduction() {
    return read("NODE_ENV") === "production";
  },

  // TiDB Cloud (driver HTTP, usado no Workers)
  get tidbHost() {
    return read("TIDB_HOST");
  },
  get tidbUser() {
    return read("TIDB_USER");
  },
  get tidbPassword() {
    return read("TIDB_PASSWORD");
  },
  get tidbDatabase() {
    return read("TIDB_DATABASE");
  },

  // Cloudflare R2 (imagens dos produtos)
  get r2AccountId() {
    return read("R2_ACCOUNT_ID");
  },
  get r2AccessKeyId() {
    return read("R2_ACCESS_KEY_ID");
  },
  get r2SecretAccessKey() {
    return read("R2_SECRET_ACCESS_KEY");
  },
  get r2Bucket() {
    return read("R2_BUCKET");
  },
  get r2PublicUrl() {
    return read("R2_PUBLIC_URL");
  },
};

import { getAdminFromCookieHeader, type AdminSession } from "./adminAuth";

/**
 * Contexto tRPC independente de runtime.
 *
 * Não guarda `req`/`res` do Express: no Cloudflare Workers eles não existem.
 * Cookies a serem enviados são acumulados em `pendingCookies` e cada adaptador
 * (Express ou fetch) escreve no header Set-Cookie do seu jeito.
 */
export type TrpcContext = {
  /** Sessão do painel administrativo (login usuário/senha + cookie assinado). */
  admin: AdminSession | null;
  /** true quando a requisição chegou por HTTPS - define o flag Secure. */
  secure: boolean;
  pendingCookies: string[];
  setCookie: (serialized: string) => void;
};

export type CreateContextInput = {
  cookieHeader?: string | null;
  secure: boolean;
};

export async function createContextFrom({
  cookieHeader,
  secure,
}: CreateContextInput): Promise<TrpcContext> {
  let admin: AdminSession | null = null;

  try {
    admin = await getAdminFromCookieHeader(cookieHeader);
  } catch {
    // Cookie ausente/inválido: rotas públicas seguem funcionando.
    admin = null;
  }

  const pendingCookies: string[] = [];

  return {
    admin,
    secure,
    pendingCookies,
    setCookie: serialized => pendingCookies.push(serialized),
  };
}

/** Detecta HTTPS considerando o proxy reverso (Cloudflare, nginx, etc). */
export function isSecureRequest(
  protocol: string | undefined,
  forwardedProto: string | string[] | undefined
): boolean {
  if (protocol === "https" || protocol === "https:") return true;
  if (!forwardedProto) return false;

  const list = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return list.some(p => p.trim().toLowerCase() === "https");
}

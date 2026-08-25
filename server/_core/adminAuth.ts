import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

export const ADMIN_COOKIE_NAME = "admin_session";

/** Sessão curta: o painel é operado por humanos, não precisa durar um ano. */
export const ADMIN_SESSION_MS = 1000 * 60 * 60 * 12; // 12h

export type AdminSession = {
  adminId: number;
  username: string;
  name: string;
};

function getSecretKey(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error(
      "JWT_SECRET nao configurado - necessario para assinar a sessao do admin"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(session: AdminSession): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + ADMIN_SESSION_MS) / 1000);

  return new SignJWT({
    adminId: session.adminId,
    username: session.username,
    name: session.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expirationSeconds)
    .sign(getSecretKey());
}

export async function verifyAdminToken(
  token: string | undefined | null
): Promise<AdminSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    const { adminId, username, name } = payload as Record<string, unknown>;

    if (
      typeof adminId !== "number" ||
      typeof username !== "string" ||
      username.length === 0
    ) {
      return null;
    }

    return {
      adminId,
      username,
      name: typeof name === "string" ? name : username,
    };
  } catch {
    // Token inválido/expirado é tratado como "não autenticado".
    return null;
  }
}

/** Lê a sessão a partir do header Cookie bruto (funciona em qualquer runtime). */
export async function getAdminFromCookieHeader(
  header: string | undefined | null
): Promise<AdminSession | null> {
  if (!header) return null;
  return verifyAdminToken(parseCookie(header)[ADMIN_COOKIE_NAME]);
}

type CookieBuildOptions = { secure: boolean; maxAgeMs?: number };

/**
 * Monta o valor de Set-Cookie da sessão do admin.
 *
 * sameSite "lax" protege contra CSRF: o painel é servido pela mesma origem
 * da API, então não há requisição cross-site legítima que precise do cookie.
 */
export function buildAdminSessionCookie(
  value: string,
  { secure, maxAgeMs }: CookieBuildOptions
): string {
  return serializeCookie(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: Math.floor((maxAgeMs ?? ADMIN_SESSION_MS) / 1000),
  });
}

export function buildAdminLogoutCookie(secure: boolean): string {
  return serializeCookie(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
}

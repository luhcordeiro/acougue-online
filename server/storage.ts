/**
 * Armazenamento das imagens de produto.
 *
 * A implementação é injetada pelo entrypoint, porque cada runtime acessa o
 * bucket de um jeito:
 *  - Cloudflare Workers: binding nativo de R2 (sem credenciais, sem SDK)
 *  - Node/Docker: API S3-compatível do R2 via @aws-sdk/client-s3
 *
 * O SDK da AWS não roda no Workers (depende de DOMParser), por isso ele fica
 * restrito ao entrypoint Node.
 */

import { ENV } from "./_core/env";

export type StorageDriver = {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
};

let _driver: StorageDriver | null = null;

export function setStorage(driver: StorageDriver | null): void {
  _driver = driver;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * URL pública do objeto.
 *
 * R2_PUBLIC_URL é o domínio público do bucket (r2.dev ou domínio próprio).
 * Sem ele o navegador não tem como buscar a imagem, então falhamos cedo em
 * vez de gravar uma URL quebrada no banco.
 */
export function buildPublicUrl(key: string): string {
  const base = ENV.r2PublicUrl;
  if (!base) {
    throw new Error(
      "R2_PUBLIC_URL nao configurado: necessario para servir as imagens dos produtos"
    );
  }
  return `${base.replace(/\/+$/, "")}/${normalizeKey(key)}`;
}

export async function storagePut(
  relKey: string,
  data: Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!_driver) {
    throw new Error(
      "Storage nao configurado: nenhum driver de R2 foi registrado neste runtime"
    );
  }

  const key = normalizeKey(relKey);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

  await _driver.put(key, bytes, contentType);

  return { key, url: buildPublicUrl(key) };
}

/** Remove o objeto. Usado ao trocar a foto da fachada, para não acumular lixo. */
export async function storageDelete(relKey: string): Promise<void> {
  if (!_driver) return;
  await _driver.delete(normalizeKey(relKey));
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: buildPublicUrl(key) };
}

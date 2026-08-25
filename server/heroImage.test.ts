import { beforeEach, describe, expect, it } from "vitest";
import { clearHeroImage } from "./db";
import { appRouter } from "./routers";
import { setStorage } from "./storage";
import type { TrpcContext } from "./_core/context";

const adminCtx = (): TrpcContext => ({
  admin: { adminId: 1, username: "admin", name: "Administrador" },
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

/** Driver de mentira: registra o que subiu e o que foi apagado. */
function fakeStorage() {
  const enviados: string[] = [];
  const apagados: string[] = [];

  setStorage({
    async put(key) {
      enviados.push(key);
    },
    async delete(key) {
      apagados.push(key);
    },
  });

  return { enviados, apagados };
}

// 1x1 PNG
const IMAGEM =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAEklEQVR4nGP4z8DwHwwZRhkQBgCCiA3/2/1AlgAAAABJRU5ErkJggg==";

describe("foto da fachada", () => {
  // O banco é compartilhado entre os testes do arquivo: sem limpar, a foto de
  // um teste vira "anterior" do seguinte e aparece na lista de apagados.
  beforeEach(async () => {
    await clearHeroImage();
  });

  it("começa vazia", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const { url } = await caller.settings.getHeroImage();
    expect(url).toBeNull();
  });

  it("exige sessão de admin para enviar", async () => {
    const caller = appRouter.createCaller(publicCtx());

    await expect(
      caller.settings.uploadHeroImage({
        fileName: "fachada",
        fileData: IMAGEM,
        mimeType: "image/png",
      })
    ).rejects.toThrow();
  });

  it("recusa arquivo que não é imagem", async () => {
    fakeStorage();
    const caller = appRouter.createCaller(adminCtx());

    await expect(
      caller.settings.uploadHeroImage({
        fileName: "planilha",
        fileData: IMAGEM,
        mimeType: "application/pdf",
      })
    ).rejects.toThrow(/precisa ser uma imagem/);
  });

  it("envia e passa a servir na home, que é pública", async () => {
    const { enviados } = fakeStorage();
    const admin = appRouter.createCaller(adminCtx());
    const loja = appRouter.createCaller(publicCtx());

    const { url } = await admin.settings.uploadHeroImage({
      fileName: "fachada",
      fileData: IMAGEM,
      mimeType: "image/png",
    });

    expect(url).toContain("site/fachada-");
    expect(enviados[0]).toMatch(/^site\/fachada-/);

    // a home busca sem estar logada
    const publico = await loja.settings.getHeroImage();
    expect(publico.url).toBe(url);
  });

  it("apaga a foto anterior ao trocar, para não acumular lixo no bucket", async () => {
    const { enviados, apagados } = fakeStorage();
    const admin = appRouter.createCaller(adminCtx());

    await admin.settings.uploadHeroImage({
      fileName: "primeira",
      fileData: IMAGEM,
      mimeType: "image/png",
    });
    await admin.settings.uploadHeroImage({
      fileName: "segunda",
      fileData: IMAGEM,
      mimeType: "image/png",
    });

    expect(enviados).toHaveLength(2);
    expect(apagados).toEqual([enviados[0]]);
  });

  it("remove a foto e volta ao fundo padrão", async () => {
    const { enviados, apagados } = fakeStorage();
    const admin = appRouter.createCaller(adminCtx());

    await admin.settings.uploadHeroImage({
      fileName: "fachada",
      fileData: IMAGEM,
      mimeType: "image/png",
    });
    await admin.settings.removeHeroImage();

    expect(apagados).toEqual([enviados[0]]);
    expect((await admin.settings.getHeroImage()).url).toBeNull();
  });
});

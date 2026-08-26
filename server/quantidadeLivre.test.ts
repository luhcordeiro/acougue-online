import { DEFAULT_QUICK_QUANTITIES } from "@shared/quantity";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { setCheckoutSettings } from "./db";
import { appRouter } from "./routers";
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

const admin = () => appRouter.createCaller(adminCtx());
const cliente = () => appRouter.createCaller(publicCtx());

async function produtoAPeso() {
  const produtos = await cliente().products.available();
  const produto = produtos.find(p => p.unit === "kg");
  if (!produto) throw new Error("nenhum produto a peso no catálogo de teste");
  return produto;
}

async function pedir(productId: number, quantity: number) {
  return cliente().orders.create({
    items: [{ productId, quantity }],
    customerName: "Cliente Teste",
    customerPhone: "18991363710",
    deliveryStreet: "Rua de Teste",
    deliveryNumber: "100",
    deliveryNeighborhood: "Centro",
    paymentMethod: "pix",
  });
}

/** Os outros arquivos assumem quantidade livre; não deixar o estado vazar. */
afterAll(async () => {
  await setCheckoutSettings({ allowFreeQuantity: true });
});

describe("quantidade livre desligada", () => {
  beforeEach(async () => {
    await setCheckoutSettings({ allowFreeQuantity: false });
  });

  it("aceita uma das quantidades cadastradas", async () => {
    const produto = await produtoAPeso();
    const permitida = (await cliente().quickQuantities.list())[0]?.valueGrams
      ?? DEFAULT_QUICK_QUANTITIES[0];

    const { success } = await pedir(produto.id, permitida);
    expect(success).toBe(true);
  });

  it("recusa peso fora da lista", async () => {
    const produto = await produtoAPeso();

    // 1,35 kg: valor que o cliente digitaria se o campo livre existisse
    await expect(pedir(produto.id, 1350)).rejects.toThrow(
      /escolha uma das quantidades disponíveis/
    );
  });

  it("diz quais quantidades servem, em vez de só recusar", async () => {
    const produto = await produtoAPeso();

    await expect(pedir(produto.id, 1350)).rejects.toThrow(/kg/);
  });

  it("não afeta produto vendido por unidade", async () => {
    // a quantidade ali é contagem de peças, não peso
    const { id } = await admin().products.create({
      name: `Refrigerante Teste ${Date.now()}`,
      price: 1100,
      unit: "un",
      available: true,
      stockKg: 0,
    });

    const { success } = await pedir(id!, 3);
    expect(success).toBe(true);
  });
});

describe("quantidade livre ligada", () => {
  beforeEach(async () => {
    await setCheckoutSettings({ allowFreeQuantity: true });
  });

  it("aceita qualquer peso dentro dos limites", async () => {
    const produto = await produtoAPeso();

    const { success } = await pedir(produto.id, 1350);
    expect(success).toBe(true);
  });

  it("continua respeitando o mínimo por item", async () => {
    const produto = await produtoAPeso();
    await expect(pedir(produto.id, 50)).rejects.toThrow();
  });
});

describe("configuração", () => {
  it("é pública para leitura, porque a vitrine precisa dela", async () => {
    const settings = await cliente().settings.getCheckoutSettings();
    expect(typeof settings.allowFreeQuantity).toBe("boolean");
  });

  it("exige sessão de admin para alterar", async () => {
    await expect(
      cliente().settings.setCheckoutSettings({ allowFreeQuantity: true })
    ).rejects.toThrow();
  });

  it("guarda o que foi salvo", async () => {
    await admin().settings.setCheckoutSettings({ allowFreeQuantity: false });
    expect((await cliente().settings.getCheckoutSettings()).allowFreeQuantity).toBe(false);

    await admin().settings.setCheckoutSettings({ allowFreeQuantity: true });
    expect((await cliente().settings.getCheckoutSettings()).allowFreeQuantity).toBe(true);
  });
});

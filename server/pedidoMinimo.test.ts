import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getCheckoutSettings, setCheckoutSettings, setDeliveryFee } from "./db";
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

/** Produto a peso com preço conhecido, para calcular o total do teste. */
async function criarProduto(precoCentavos: number) {
  const { id } = await admin().products.create({
    name: `Produto Minimo ${Date.now()}-${Math.random()}`,
    price: precoCentavos,
    unit: "un",
    available: true,
    stockKg: 0,
  });
  return id!;
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

afterAll(async () => {
  await setCheckoutSettings({ allowFreeQuantity: true, minOrderAmount: 0 });
  await setDeliveryFee(0);
});

describe("pedido mínimo", () => {
  beforeEach(async () => {
    await setCheckoutSettings({ allowFreeQuantity: true, minOrderAmount: 3000 });
    await setDeliveryFee(0);
  });

  it("recusa pedido abaixo do mínimo", async () => {
    const id = await criarProduto(1000); // R$ 10,00

    await expect(pedir(id, 2)).rejects.toThrow(/pedido mínimo é de R\$ 30,00/);
  });

  it("diz quanto falta, em vez de só recusar", async () => {
    const id = await criarProduto(1000);

    // R$ 20,00 em produtos, faltam R$ 10,00
    await expect(pedir(id, 2)).rejects.toThrow(/Faltam R\$ 10,00/);
  });

  it("aceita exatamente o valor mínimo", async () => {
    const id = await criarProduto(1500);

    const { success } = await pedir(id, 2); // R$ 30,00
    expect(success).toBe(true);
  });

  it("aceita acima do mínimo", async () => {
    const id = await criarProduto(4000);

    const { success } = await pedir(id, 1);
    expect(success).toBe(true);
  });

  it("não conta a taxa de entrega para atingir o mínimo", async () => {
    // Com taxa de R$ 15, um pedido de R$ 20 chegaria a R$ 35 no total. Se a
    // taxa valesse, o cliente atingiria o mínimo sem levar mais mercadoria.
    await setDeliveryFee(1500);
    const id = await criarProduto(1000);

    await expect(pedir(id, 2)).rejects.toThrow(/pedido mínimo/);
  });

  it("mínimo zero desliga a exigência", async () => {
    await setCheckoutSettings({ allowFreeQuantity: true, minOrderAmount: 0 });
    const id = await criarProduto(500);

    const { success } = await pedir(id, 1); // R$ 5,00
    expect(success).toBe(true);
  });
});

describe("configuração do mínimo", () => {
  it("é pública para leitura, porque o carrinho precisa dela", async () => {
    const settings = await cliente().settings.getCheckoutSettings();
    expect(typeof settings.minOrderAmount).toBe("number");
  });

  it("exige sessão de admin para alterar", async () => {
    await expect(
      cliente().settings.setCheckoutSettings({
        allowFreeQuantity: true,
        minOrderAmount: 5000,
      })
    ).rejects.toThrow();
  });

  it("guarda o valor salvo", async () => {
    await admin().settings.setCheckoutSettings({
      allowFreeQuantity: true,
      minOrderAmount: 4500,
    });

    expect((await getCheckoutSettings()).minOrderAmount).toBe(4500);
  });

  it("recusa valor negativo", async () => {
    await expect(
      admin().settings.setCheckoutSettings({
        allowFreeQuantity: true,
        minOrderAmount: -100,
      })
    ).rejects.toThrow(/não pode ser negativo/);
  });

  it("recusa centavos fracionados", async () => {
    await expect(
      admin().settings.setCheckoutSettings({
        allowFreeQuantity: true,
        minOrderAmount: 3000.5,
      })
    ).rejects.toThrow(/em centavos/);
  });
});

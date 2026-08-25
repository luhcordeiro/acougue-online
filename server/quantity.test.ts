import {
  calcSubtotal,
  formatPrice,
  formatQuantity,
  MAX_ITEM_GRAMS,
  MAX_ITEM_UNITS,
  MIN_ITEM_GRAMS,
  MIN_ITEM_UNITS,
  parseKgInput,
} from "@shared/quantity";
import { describe, expect, it } from "vitest";
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

describe("calcSubtotal", () => {
  it("a peso, cobra proporcional ao quilo", () => {
    // R$ 41,98/kg x 1,5 kg = R$ 62,97
    expect(calcSubtotal("kg", 4198, 1500)).toBe(6297);
    expect(calcSubtotal("kg", 4198, 1000)).toBe(4198);
  });

  it("por peça, multiplica direto", () => {
    // erro clássico: dividir por 1000 e cobrar centavos por uma garrafa
    expect(calcSubtotal("un", 350, 3)).toBe(1050);
    expect(calcSubtotal("un", 200, 1)).toBe(200);
  });

  it("arredonda o subtotal a peso, não a fração de centavo", () => {
    // R$ 89,90/kg x 1,35 kg = R$ 121,365 -> R$ 121,37
    expect(calcSubtotal("kg", 8990, 1350)).toBe(12137);
  });
});

describe("formatPrice", () => {
  it("mostra a unidade de venda", () => {
    expect(formatPrice(4198, "kg")).toBe("R$ 41,98/kg");
    expect(formatPrice(350, "un")).toBe("R$ 3,50/un");
  });
});

describe("formatQuantity", () => {
  it("conta peças quando vendido por unidade", () => {
    expect(formatQuantity(3, "un")).toBe("3 un");
    expect(formatQuantity(1, "un")).toBe("1 un");
  });

  it("mostra em gramas abaixo de 1 kg", () => {
    // com quantidade livre isto importa: toFixed(1) exibiria "0.3 kg"
    expect(formatQuantity(250)).toBe("250 g");
    expect(formatQuantity(100)).toBe("100 g");
    expect(formatQuantity(999)).toBe("999 g");
  });

  it("mostra em kg a partir de 1 kg, sem zeros sobrando", () => {
    expect(formatQuantity(1000)).toBe("1 kg");
    expect(formatQuantity(1500)).toBe("1,5 kg");
    expect(formatQuantity(2600)).toBe("2,6 kg");
    expect(formatQuantity(1250)).toBe("1,25 kg");
  });

  it("não come o zero das dezenas", () => {
    // regressão: uma versão anterior transformava 10 kg em "1 kg"
    expect(formatQuantity(10_000)).toBe("10 kg");
    expect(formatQuantity(20_000)).toBe("20 kg");
    expect(formatQuantity(12_500)).toBe("12,5 kg");
  });
});

describe("parseKgInput", () => {
  it("aceita vírgula e ponto", () => {
    expect(parseKgInput("1,5")).toBe(1.5);
    expect(parseKgInput("1.5")).toBe(1.5);
    expect(parseKgInput(" 2,25 ")).toBe(2.25);
  });

  it("devolve NaN para entrada vazia ou inválida", () => {
    expect(parseKgInput("")).toBeNaN();
    expect(parseKgInput("   ")).toBeNaN();
    expect(parseKgInput("abc")).toBeNaN();
  });
});

describe("limites no servidor", () => {
  /** Primeiro produto a peso: escolher pelo índice quebra quando um teste
   *  cria produto cujo nome vem antes na ordem alfabética. */
  const produtoAPeso = async () => {
    const caller = appRouter.createCaller(publicCtx());
    const produtos = await caller.products.available();
    const produto = produtos.find(p => p.unit === "kg");
    if (!produto) throw new Error("nenhum produto a peso no catálogo de teste");
    return produto;
  };

  const pedidoCom = async (quantity: number) => {
    const caller = appRouter.createCaller(publicCtx());
    const produto = await produtoAPeso();

    return caller.orders.create({
      items: [{ productId: produto.id, quantity }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });
  };

  it("aceita quantidade livre dentro dos limites", async () => {
    // 1,35 kg: nenhuma quantidade rápida, digitada pelo cliente
    const result = await pedidoCom(1350);
    expect(result.success).toBe(true);
  });

  it("aceita exatamente o mínimo", async () => {
    const result = await pedidoCom(MIN_ITEM_GRAMS);
    expect(result.success).toBe(true);
  });

  it("recusa abaixo do mínimo", async () => {
    await expect(pedidoCom(MIN_ITEM_GRAMS - 1)).rejects.toThrow();
  });

  it("recusa acima do máximo", async () => {
    await expect(pedidoCom(MAX_ITEM_GRAMS + 1)).rejects.toThrow();
  });

  it("recusa fração de grama", async () => {
    await expect(pedidoCom(1000.5)).rejects.toThrow();
  });

  it("cobra por peça em produto vendido por unidade", async () => {
    const admin = appRouter.createCaller(adminCtx());
    const cliente = appRouter.createCaller(publicCtx());

    const { id } = await admin.products.create({
      name: "Refrigerante Teste 2L",
      price: 1100,
      unit: "un",
      available: true,
      stockKg: 0,
    });

    const { orderId } = await cliente.orders.create({
      items: [{ productId: id!, quantity: 3 }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });

    const { items } = await cliente.orders.getById({ id: orderId });

    // 3 x R$ 11,00 = R$ 33,00 (e nao R$ 0,03, que seria dividir por 1000)
    expect(items[0].unit).toBe("un");
    expect(items[0].quantity).toBe(3);
    expect(items[0].subtotal).toBe(3300);
  });

  it("recusa mais peças que o limite", async () => {
    const admin = appRouter.createCaller(adminCtx());
    const cliente = appRouter.createCaller(publicCtx());

    const { id } = await admin.products.create({
      name: "Agua Teste 500ml",
      price: 200,
      unit: "un",
      available: true,
      stockKg: 0,
    });

    await expect(
      cliente.orders.create({
        items: [{ productId: id!, quantity: MAX_ITEM_UNITS + 1 }],
        customerName: "Cliente Teste",
        customerPhone: "11999999999",
        deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
        paymentMethod: "pix",
      })
    ).rejects.toThrow(/quantidade deve estar entre/);
  });

  it("aceita uma unica peca", async () => {
    const admin = appRouter.createCaller(adminCtx());
    const cliente = appRouter.createCaller(publicCtx());

    const { id } = await admin.products.create({
      name: "Bolacha Teste 100g",
      price: 350,
      unit: "un",
      available: true,
      stockKg: 0,
    });

    const { orderId } = await cliente.orders.create({
      items: [{ productId: id!, quantity: MIN_ITEM_UNITS }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });

    expect(orderId).toBeGreaterThan(0);
  });

  it("aceita pedido de item por unidade sem tipo de corte", async () => {
    // mercearia não se corta: exigir corte aqui travaria o checkout
    const admin = appRouter.createCaller(adminCtx());
    const cliente = appRouter.createCaller(publicCtx());

    const { id } = await admin.products.create({
      name: "Detergente Teste 500ml",
      price: 250,
      unit: "un",
      available: true,
      stockKg: 0,
    });

    const { orderId } = await cliente.orders.create({
      items: [{ productId: id!, quantity: 2 }], // sem cutTypeName
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });

    const { items } = await cliente.orders.getById({ id: orderId });
    expect(items[0].cutTypeName).toBeNull();
    expect(items[0].subtotal).toBe(500);
  });

  it("cobra proporcional à quantidade digitada", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const produto = await produtoAPeso();

    const { orderId } = await caller.orders.create({
      items: [{ productId: produto.id, quantity: 1350 }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });

    const { items } = await caller.orders.getById({ id: orderId });
    const esperado = Math.round((produto.price * 1350) / 1000);

    expect(items[0].quantity).toBe(1350);
    expect(items[0].subtotal).toBe(esperado);
  });
});

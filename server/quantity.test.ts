import {
  formatQuantity,
  MAX_ITEM_GRAMS,
  MIN_ITEM_GRAMS,
  parseKgInput,
} from "@shared/quantity";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

describe("formatQuantity", () => {
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
  const pedidoCom = async (quantityGrams: number) => {
    const caller = appRouter.createCaller(publicCtx());
    const produtos = await caller.products.available();

    return caller.orders.create({
      items: [{ productId: produtos[0].id, quantityGrams }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryAddress: "Rua de Teste, 100 - Centro",
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

  it("cobra proporcional à quantidade digitada", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const produtos = await caller.products.available();
    const produto = produtos[0];

    const { orderId } = await caller.orders.create({
      items: [{ productId: produto.id, quantityGrams: 1350 }],
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryAddress: "Rua de Teste, 100 - Centro",
      paymentMethod: "pix",
    });

    const { items } = await caller.orders.getById({ id: orderId });
    const esperado = Math.round((produto.pricePerKg * 1350) / 1000);

    expect(items[0].quantityGrams).toBe(1350);
    expect(items[0].subtotal).toBe(esperado);
  });
});

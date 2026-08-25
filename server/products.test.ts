import { describe, expect, it } from "vitest";
import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    admin: {
      adminId: 1,
      username: "admin",
      name: "Administrador",
    },
    secure: true,
    pendingCookies: [],
    setCookie: () => {},
  };
}

function createUserContext(): TrpcContext {
  return {
    admin: null,
    secure: true,
    pendingCookies: [],
    setCookie: () => {},
  };
}

describe("products.list", () => {
  it("retorna a lista completa para o admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list();

    expect(Array.isArray(products)).toBe(true);
    // Deve ter produtos do seed
    expect(products.length).toBeGreaterThan(0);
  });

  it("bloqueia quem não tem sessão de admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.products.list()).rejects.toThrow(NOT_ADMIN_ERR_MSG);
  });
});

describe("products.available", () => {
  it("retorna apenas produtos disponíveis", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.available();

    expect(Array.isArray(products)).toBe(true);
    // Todos devem estar disponíveis
    products.forEach(product => {
      expect(product.available).toBe(true);
    });
  });
});

describe("products.create", () => {
  it("permite que admin crie produtos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.create({
      name: "Produto Teste",
      description: "Descrição do produto teste",
      pricePerKg: 5000, // R$ 50.00/kg
      stockKg: 10000, // 10 kg em gramas
      available: true,
    });

    expect(result.success).toBe(true);
  });

  it("bloqueia usuários não-admin de criar produtos", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.create({
        name: "Produto Não Autorizado",
        pricePerKg: 5000,
        stockKg: 10000,
        available: true,
      })
    ).rejects.toThrow(NOT_ADMIN_ERR_MSG);
  });
});

describe("products.update", () => {
  it("permite que admin atualize produtos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro, pegar um produto existente
    const products = await caller.products.list();
    if (products.length > 0) {
      const productId = products[0].id;

      const result = await caller.products.update({
        id: productId,
        pricePerKg: 6000, // Atualizar preço
      });

      expect(result.success).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("products.list", () => {
  it("retorna lista de produtos para qualquer usuário", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.products.list();

    expect(Array.isArray(products)).toBe(true);
    // Deve ter produtos do seed
    expect(products.length).toBeGreaterThan(0);
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
    ).rejects.toThrow(/Acesso negado/);
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

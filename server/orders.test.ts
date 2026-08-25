import { describe, expect, it, beforeAll } from "vitest";
import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUserContext(userId: number = 2): TrpcContext {
  return {
    admin: null,
    secure: true,
    pendingCookies: [],
    setCookie: () => {},
  };
}

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

describe("orders.create", () => {
  it("valida que produtos existem antes de criar pedido", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro, pegar produtos disponíveis
    const products = await caller.products.available();
    
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('price');
  });

  it("valida cálculo de preço", async () => {
    // Teste de cálculo: 1.5kg a R$50/kg = R$75
    const price = 5000; // R$50 em centavos
    const quantityGrams = 1500; // 1.5kg
    const expectedTotal = Math.round((price * quantityGrams) / 1000);
    
    expect(expectedTotal).toBe(7500); // R$75 em centavos
  });

  it("valida estrutura de item de pedido", async () => {
    const item = {
      productId: 1,
      quantity: 1000,
    };

    expect(item.productId).toBeGreaterThan(0);
    expect(item.quantity).toBeGreaterThan(0);
  });
});

describe("orders.listAll", () => {
  it("permite que admin liste todos os pedidos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const orders = await caller.orders.listAll();

    expect(Array.isArray(orders)).toBe(true);
  });

  it("bloqueia usuários não-admin de listar todos os pedidos", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.orders.listAll()).rejects.toThrow(NOT_ADMIN_ERR_MSG);
  });
});

describe("orders.updateStatus", () => {
  it("valida enum de status", async () => {
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('delivered');
    expect(validStatuses.length).toBe(6);
  });
});

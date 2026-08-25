import { describe, expect, it } from "vitest";
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

describe("quickQuantities", () => {
  it("should list all quick quantities", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const quickQuantities = await caller.quickQuantities.list();
    
    expect(Array.isArray(quickQuantities)).toBe(true);
  });

  it("should create a new quick quantity", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quickQuantities.create({
      valueGrams: 750,
      label: "750g Teste",
      sortOrder: 10,
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("quickQuantityId");
    expect(typeof result.quickQuantityId).toBe("number");
  });

  it("should list quick quantities after creation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Criar uma quantidade rápida
    await caller.quickQuantities.create({
      valueGrams: 2500,
      label: "2.5kg Lista",
      sortOrder: 20,
    });

    // Listar e verificar
    const quickQuantities = await caller.quickQuantities.list();
    const found = quickQuantities.find((qq) => qq.label === "2.5kg Lista");
    
    expect(found).toBeDefined();
    expect(found?.valueGrams).toBe(2500);
  });

  it("should get quick quantities by product", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Buscar quantidades para um produto (pode estar vazio)
    const result = await caller.quickQuantities.getByProduct({ productId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

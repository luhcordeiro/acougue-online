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

describe("cutTypes", () => {
  it("should list all cut types", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const cutTypes = await caller.cutTypes.list();
    
    expect(Array.isArray(cutTypes)).toBe(true);
  });

  it("should create a new cut type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cutTypes.create({
      name: "Moído Teste",
      description: "Carne moída para hambúrguer",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("cutTypeId");
    expect(typeof result.cutTypeId).toBe("number");
  });

  it("should list cut types after creation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Criar um tipo de corte
    await caller.cutTypes.create({
      name: "Em Cubos Lista",
      description: "Para teste de listagem",
    });

    // Listar e verificar
    const cutTypes = await caller.cutTypes.list();
    const found = cutTypes.find((ct) => ct.name === "Em Cubos Lista");
    
    expect(found).toBeDefined();
    expect(found?.description).toBe("Para teste de listagem");
  });
});

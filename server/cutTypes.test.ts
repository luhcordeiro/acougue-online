import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const adminUser: AuthenticatedUser = {
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
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
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

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

describe("Delivery Fee Settings", () => {
  it("should get delivery fee", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const fee = await caller.settings.getDeliveryFee();
    expect(typeof fee).toBe("number");
    expect(fee).toBeGreaterThanOrEqual(0);
  });

  it("should update delivery fee", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Atualizar taxa de entrega para 1000 centavos (R$ 10,00)
    await caller.settings.setDeliveryFee({ feeInCents: 1000 });
    
    // Verificar se foi atualizado
    const fee = await caller.settings.getDeliveryFee();
    expect(fee).toBe(1000);
    
    // Restaurar para valor anterior
    await caller.settings.setDeliveryFee({ feeInCents: 500 });
  });
});

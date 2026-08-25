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

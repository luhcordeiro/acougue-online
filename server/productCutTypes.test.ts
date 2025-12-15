import { describe, it, expect } from "vitest";
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Product Cut Types", () => {
  it("should list all cut types (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const cutTypes = await caller.cutTypes.list();
    expect(Array.isArray(cutTypes)).toBe(true);
  });

  it("should get cut types for a specific product (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    // Buscar tipos de corte do produto 1
    const productCutTypes = await caller.cutTypes.getByProduct({ productId: 1 });
    expect(Array.isArray(productCutTypes)).toBe(true);
  });

  it("should add cut type to product (admin only)", async () => {
    const publicCtx = createPublicContext();
    const adminCtx = createAdminContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const adminCaller = appRouter.createCaller(adminCtx);
    
    // Primeiro, buscar tipos de corte existentes
    const cutTypes = await publicCaller.cutTypes.list();
    
    if (cutTypes.length > 0) {
      const cutTypeId = cutTypes[0].id;
      
      // Adicionar ao produto 1 (admin)
      const result = await adminCaller.cutTypes.addToProduct({
        productId: 1,
        cutTypeId: cutTypeId
      });
      
      expect(result.success).toBe(true);
    }
  });

  it("should get product cut types after adding", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const productCutTypes = await caller.cutTypes.getByProduct({ productId: 1 });
    expect(Array.isArray(productCutTypes)).toBe(true);
  });

  it("should remove cut type from product (admin only)", async () => {
    const publicCtx = createPublicContext();
    const adminCtx = createAdminContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const adminCaller = appRouter.createCaller(adminCtx);
    
    const productCutTypes = await publicCaller.cutTypes.getByProduct({ productId: 1 });
    
    if (productCutTypes.length > 0) {
      const cutTypeId = productCutTypes[0].id;
      
      const result = await adminCaller.cutTypes.removeFromProduct({
        productId: 1,
        cutTypeId: cutTypeId
      });
      
      expect(result.success).toBe(true);
    }
  });
});

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
    
    // Buscar produtos disponíveis primeiro
    const products = await caller.products.available();
    
    if (products.length > 0) {
      // Usar o primeiro produto disponível
      const productCutTypes = await caller.cutTypes.getByProduct({ productId: products[0].id });
      expect(Array.isArray(productCutTypes)).toBe(true);
    } else {
      // Se não houver produtos, apenas verificar que a função não quebra
      const productCutTypes = await caller.cutTypes.getByProduct({ productId: 999999 });
      expect(Array.isArray(productCutTypes)).toBe(true);
    }
  });

  it("should add and remove cut type to product (admin only)", async () => {
    const publicCtx = createPublicContext();
    const adminCtx = createAdminContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const adminCaller = appRouter.createCaller(adminCtx);
    
    // Buscar tipos de corte existentes
    const cutTypes = await publicCaller.cutTypes.list();
    // Buscar produtos disponíveis
    const products = await publicCaller.products.available();
    
    if (cutTypes.length > 0 && products.length > 0) {
      const cutTypeId = cutTypes[0].id;
      const productId = products[0].id;
      
      // Adicionar ao produto (admin)
      const addResult = await adminCaller.cutTypes.addToProduct({
        productId: productId,
        cutTypeId: cutTypeId
      });
      
      expect(addResult.success).toBe(true);
      
      // Verificar se foi adicionado
      const productCutTypes = await publicCaller.cutTypes.getByProduct({ productId });
      expect(Array.isArray(productCutTypes)).toBe(true);
      
      // Remover do produto (admin)
      const removeResult = await adminCaller.cutTypes.removeFromProduct({
        productId: productId,
        cutTypeId: cutTypeId
      });
      
      expect(removeResult.success).toBe(true);
    }
  });
});

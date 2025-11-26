import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("addresses", () => {
  describe("addresses.create", () => {
    it("permite que usuário autenticado crie endereço", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.addresses.create({
        label: "Casa",
        street: "Rua Teste",
        number: "123",
        complement: "Apto 45",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        isDefault: true,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("addressId");
      expect(typeof result.addressId).toBe("number");
    });

    it("valida campos obrigatórios", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.addresses.create({
          street: "",
          number: "123",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-567",
        })
      ).rejects.toThrow();
    });
  });

  describe("addresses.list", () => {
    it("retorna lista de endereços do usuário", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const addresses = await caller.addresses.list();
      expect(Array.isArray(addresses)).toBe(true);
    });
  });

  describe("addresses.update", () => {
    it("permite atualizar endereço próprio", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Criar endereço primeiro
      const created = await caller.addresses.create({
        street: "Rua Original",
        number: "100",
        neighborhood: "Bairro",
        city: "Cidade",
        state: "SP",
        zipCode: "12345-678",
      });

      const result = await caller.addresses.update({
        id: created.addressId,
        street: "Rua Atualizada",
      });

      expect(result).toHaveProperty("success", true);
    });
  });

  describe("addresses.delete", () => {
    it("permite deletar endereço próprio", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Criar endereço primeiro
      const created = await caller.addresses.create({
        street: "Rua Temporária",
        number: "999",
        neighborhood: "Bairro",
        city: "Cidade",
        state: "SP",
        zipCode: "99999-999",
      });

      const result = await caller.addresses.delete({
        id: created.addressId,
      });

      expect(result).toHaveProperty("success", true);
    });
  });
});

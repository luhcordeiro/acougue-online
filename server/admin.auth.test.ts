import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
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

describe("Admin Authentication", () => {
  let testUserId: number;
  const adminCaller = appRouter.createCaller(createAdminContext());
  const publicCaller = appRouter.createCaller(createPublicContext());

  beforeAll(async () => {
    // Limpar usuários de teste anteriores
    const existingUser = await db.getAdminUserByUsername("testadmin");
    if (existingUser) {
      await db.deleteAdminUser(existingUser.id);
    }
  });

  afterAll(async () => {
    // Limpar usuário de teste criado
    const testUser = await db.getAdminUserByUsername("testadmin");
    if (testUser) {
      await db.deleteAdminUser(testUser.id);
    }
  });

  it("deve criar um novo usuário admin", async () => {
    const result = await adminCaller.adminUsers.create({
      username: "testadmin",
      password: "test123456",
      name: "Test Admin",
      email: "test@example.com",
    });

    expect(result).toBeDefined();
    expect(result.username).toBe("testadmin");
    expect(result.name).toBe("Test Admin");
    expect(result.email).toBe("test@example.com");
    expect(result.active).toBe(true);
    
    // Salvar ID para próximos testes
    testUserId = result.id!;
  });

  it("deve fazer login com credenciais válidas", async () => {
    const result = await publicCaller.adminAuth.login({
      username: "testadmin",
      password: "test123456",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.username).toBe("testadmin");
    expect(result.user.name).toBe("Test Admin");
  });

  it("deve rejeitar login com senha incorreta", async () => {
    await expect(
      publicCaller.adminAuth.login({
        username: "testadmin",
        password: "senhaerrada",
      })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("deve rejeitar login com usuário inexistente", async () => {
    await expect(
      publicCaller.adminAuth.login({
        username: "usuarioinexistente",
        password: "qualquersenha",
      })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("deve listar usuários admin", async () => {
    const users = await adminCaller.adminUsers.list();
    
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    
    // Verificar que passwordHash não está sendo retornado
    users.forEach(user => {
      expect(user).not.toHaveProperty("passwordHash");
    });
  });

  it("deve atualizar um usuário admin", async () => {
    await adminCaller.adminUsers.update({
      id: testUserId,
      name: "Test Admin Updated",
      email: "updated@example.com",
    });

    const updatedUser = await db.getAdminUserById(testUserId);
    expect(updatedUser?.name).toBe("Test Admin Updated");
    expect(updatedUser?.email).toBe("updated@example.com");
  });

  it("deve atualizar senha do usuário", async () => {
    await adminCaller.adminUsers.update({
      id: testUserId,
      password: "novasenha123",
    });

    // Tentar fazer login com a nova senha
    const result = await publicCaller.adminAuth.login({
      username: "testadmin",
      password: "novasenha123",
    });

    expect(result.success).toBe(true);
  });

  it("deve deletar um usuário admin", async () => {
    await adminCaller.adminUsers.delete({ id: testUserId });

    const deletedUser = await db.getAdminUserById(testUserId);
    expect(deletedUser).toBeNull();
  });

  it("não deve permitir deletar o último usuário ativo", async () => {
    // Criar um usuário temporário
    const tempUser = await adminCaller.adminUsers.create({
      username: "tempuser",
      password: "temp123",
      name: "Temp User",
    });

    // Verificar se há outros usuários ativos
    const allUsers = await db.listAdminUsers();
    const activeUsers = allUsers.filter(u => u.active);

    if (activeUsers.length === 1) {
      // Se for o único usuário ativo, deve rejeitar
      await expect(
        adminCaller.adminUsers.delete({ id: tempUser.id! })
      ).rejects.toThrow("Não é possível deletar o único usuário ativo");
    } else {
      // Se houver outros, pode deletar
      await adminCaller.adminUsers.delete({ id: tempUser.id! });
      const deleted = await db.getAdminUserById(tempUser.id!);
      expect(deleted).toBeNull();
    }
  });
});

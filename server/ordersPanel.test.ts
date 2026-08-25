import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminCtx = (): TrpcContext => ({
  admin: { adminId: 1, username: "admin", name: "Administrador" },
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

const admin = () => appRouter.createCaller(adminCtx());
const cliente = () => appRouter.createCaller(publicCtx());

async function criarPedidos(quantidade: number): Promise<number[]> {
  const caller = cliente();
  const produtos = await caller.products.available();
  const produto = produtos.find(p => p.unit === "kg")!;
  const ids: number[] = [];

  for (let i = 0; i < quantidade; i++) {
    const { orderId } = await caller.orders.create({
      items: [{ productId: produto.id, quantity: 1000 }],
      customerName: `Cliente ${i + 1}`,
      customerPhone: "11999999999",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });
    ids.push(orderId);
  }

  return ids;
}

/** Cada teste começa sem pedidos, senão a contagem de páginas vira loteria. */
async function limparPedidos() {
  const caller = admin();
  const { items } = await caller.orders.list({ page: 1, pageSize: "100" });
  if (items.length > 0) {
    await caller.orders.delete({ ids: items.map(o => o.id) });
  }
}

describe("painel de pedidos", () => {
  beforeEach(limparPedidos);

  describe("paginação", () => {
    it("respeita o tamanho de página escolhido", async () => {
      await criarPedidos(25);
      const caller = admin();

      const p20 = await caller.orders.list({ page: 1, pageSize: "20" });
      expect(p20.items).toHaveLength(20);
      expect(p20.total).toBe(25);
      expect(p20.totalPages).toBe(2);

      const p50 = await caller.orders.list({ page: 1, pageSize: "50" });
      expect(p50.items).toHaveLength(25);
      expect(p50.totalPages).toBe(1);
    });

    it("traz o restante na segunda página, sem repetir", async () => {
      await criarPedidos(25);
      const caller = admin();

      const p1 = await caller.orders.list({ page: 1, pageSize: "20" });
      const p2 = await caller.orders.list({ page: 2, pageSize: "20" });

      expect(p2.items).toHaveLength(5);

      const idsP1 = new Set(p1.items.map(o => o.id));
      expect(p2.items.some(o => idsP1.has(o.id))).toBe(false);
    });

    it("lista do mais novo para o mais antigo", async () => {
      const ids = await criarPedidos(5);
      const { items } = await admin().orders.list({ page: 1, pageSize: "20" });

      expect(items[0].id).toBe(ids[ids.length - 1]);
    });

    it("não devolve página vazia quando o pedido pedido passou do fim", async () => {
      await criarPedidos(3);

      // usuário estava na página 5 e os pedidos foram apagados
      const resultado = await admin().orders.list({ page: 5, pageSize: "20" });

      expect(resultado.page).toBe(1);
      expect(resultado.items).toHaveLength(3);
    });

    it("filtra por status mantendo a contagem coerente", async () => {
      const ids = await criarPedidos(4);
      const caller = admin();
      await caller.orders.updateStatus({ id: ids[0], status: "delivered" });

      const pendentes = await caller.orders.list({
        page: 1,
        pageSize: "20",
        status: "pending",
      });

      expect(pendentes.total).toBe(3);
      expect(pendentes.items.every(o => o.status === "pending")).toBe(true);
    });

    it("exige sessão de admin", async () => {
      await expect(
        cliente().orders.list({ page: 1, pageSize: "20" })
      ).rejects.toThrow();
    });
  });

  describe("exclusão", () => {
    it("apaga os pedidos selecionados e mantém os demais", async () => {
      const ids = await criarPedidos(4);
      const caller = admin();

      const { removidos } = await caller.orders.delete({ ids: [ids[0], ids[1]] });
      expect(removidos).toBe(2);

      const { items, total } = await caller.orders.list({ page: 1, pageSize: "20" });
      expect(total).toBe(2);
      expect(items.map(o => o.id).sort()).toEqual([ids[2], ids[3]].sort());
    });

    it("apaga também os itens, senão a foreign key barraria", async () => {
      const [id] = await criarPedidos(1);
      const caller = admin();

      await caller.orders.delete({ ids: [id] });

      await expect(caller.orders.getById({ id })).rejects.toThrow();
    });

    it("exige sessão de admin", async () => {
      const [id] = await criarPedidos(1);
      await expect(cliente().orders.delete({ ids: [id] })).rejects.toThrow();
    });

    it("recusa lista vazia", async () => {
      await expect(admin().orders.delete({ ids: [] })).rejects.toThrow();
    });
  });

  describe("impressão confirma o pedido", () => {
    it("promove de pendente para confirmado", async () => {
      const [id] = await criarPedidos(1);
      const caller = admin();

      const resultado = await caller.orders.markPrinted({ id });

      expect(resultado.changed).toBe(true);
      const { order } = await caller.orders.getById({ id });
      expect(order.status).toBe("confirmed");
    });

    it("não faz o status andar para trás ao reimprimir", async () => {
      const [id] = await criarPedidos(1);
      const caller = admin();
      await caller.orders.updateStatus({ id, status: "delivered" });

      const resultado = await caller.orders.markPrinted({ id });

      expect(resultado.changed).toBe(false);
      const { order } = await caller.orders.getById({ id });
      expect(order.status).toBe("delivered");
    });

    it("exige sessão de admin", async () => {
      const [id] = await criarPedidos(1);
      await expect(cliente().orders.markPrinted({ id })).rejects.toThrow();
    });
  });

  describe("resumo", () => {
    it("informa o último id e quantos estão pendentes", async () => {
      const ids = await criarPedidos(3);
      const caller = admin();
      await caller.orders.updateStatus({ id: ids[0], status: "delivered" });

      const resumo = await caller.orders.summary();

      expect(resumo.lastOrderId).toBe(ids[ids.length - 1]);
      expect(resumo.pendingCount).toBe(2);
    });
  });
});

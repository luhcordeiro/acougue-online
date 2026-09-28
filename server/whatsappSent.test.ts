import { appRouter } from "./routers";
import * as db from "./db";
import { describe, expect, it } from "vitest";

const caller = () =>
  appRouter.createCaller({
    admin: { adminId: 1, username: "teste", name: "Teste" },
    secure: true,
    pendingCookies: [],
    setCookie: () => {},
  } as any);

async function pedidoNovo() {
  const produtos = await db.getAvailableProducts();
  const p = produtos[0];

  return await db.createOrderWithItems(
    {
      customerName: "Cliente Aviso",
      customerPhone: "(18) 99136-3710",
      deliveryAddress: "Rua A, 1 - Centro",
      paymentMethod: "pix",
      totalAmount: 1000,
    } as any,
    [
      {
        productId: p.id,
        productName: p.name,
        price: p.price,
        unit: p.unit,
        quantity: p.unit === "un" ? 1 : 1000,
        subtotal: 1000,
      } as any,
    ]
  );
}

describe("aviso pelo WhatsApp", () => {
  it("nasce sem marca de avisado", async () => {
    const id = await pedidoNovo();
    const pedido = await db.getOrderById(id);
    expect(pedido?.whatsappSentAt).toBeFalsy();
  });

  it("guarda quando o cliente foi avisado", async () => {
    const id = await pedidoNovo();
    const antes = Date.now();

    const r = await caller().orders.markWhatsappSent({ id });
    expect(r.success).toBe(true);

    const pedido = await db.getOrderById(id);
    expect(pedido?.whatsappSentAt).toBeTruthy();
    expect(pedido!.whatsappSentAt!.getTime()).toBeGreaterThanOrEqual(antes - 2000);
  });

  it("mantém o horário do primeiro aviso ao reabrir a conversa", async () => {
    const id = await pedidoNovo();

    await caller().orders.markWhatsappSent({ id });
    const primeiro = (await db.getOrderById(id))!.whatsappSentAt!.getTime();

    // reabrir para tirar uma dúvida não pode reescrever quando o cliente soube
    await new Promise(r => setTimeout(r, 1100));
    await caller().orders.markWhatsappSent({ id });

    expect((await db.getOrderById(id))!.whatsappSentAt!.getTime()).toBe(primeiro);
  });

  it("não mexe no andamento do pedido", async () => {
    const id = await pedidoNovo();
    const antes = (await db.getOrderById(id))!.status;

    await caller().orders.markWhatsappSent({ id });

    // avisar o cliente e confirmar o pedido são coisas diferentes
    expect((await db.getOrderById(id))!.status).toBe(antes);
  });

  it("recusa pedido que não existe", async () => {
    await expect(caller().orders.markWhatsappSent({ id: 999999 })).rejects.toThrow();
  });

  it("a listagem do painel traz a marca, senão o botão não saberia a cor", async () => {
    const id = await pedidoNovo();
    await caller().orders.markWhatsappSent({ id });

    const pagina = await caller().orders.list({ page: 1, pageSize: "100" });
    const naLista = pagina.items.find(o => o.id === id);

    expect(naLista?.whatsappSentAt).toBeTruthy();
  });
});

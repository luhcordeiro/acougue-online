import { beforeEach, describe, expect, it } from "vitest";
import {
  enqueuePrintJob,
  getPrintQueueStatus,
  markPrintJobDone,
  markPrintJobFailed,
  nextPrintJobs,
  retryFailedPrintJobs,
  setOrderAlerts,
} from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

async function limparFila() {
  // esvazia marcando tudo como impresso
  let pendentes = await nextPrintJobs(100);
  while (pendentes.length > 0) {
    for (const job of pendentes) await markPrintJobDone(job.id);
    pendentes = await nextPrintJobs(100);
  }
  await retryFailedPrintJobs();
  const falhos = await nextPrintJobs(100);
  for (const job of falhos) await markPrintJobDone(job.id);
}

describe("fila de impressão", () => {
  beforeEach(limparFila);

  it("entrega os cupons na ordem de chegada", async () => {
    await enqueuePrintJob(null, "primeiro");
    await enqueuePrintJob(null, "segundo");

    const fila = await nextPrintJobs(5);

    expect(fila.map(j => j.content)).toEqual(["primeiro", "segundo"]);
  });

  it("some da fila depois de impresso", async () => {
    const id = await enqueuePrintJob(null, "cupom");

    await markPrintJobDone(id);

    expect(await nextPrintJobs(5)).toHaveLength(0);
  });

  it("devolve para a fila quando a impressão falha", async () => {
    const id = await enqueuePrintJob(null, "cupom");

    await markPrintJobFailed(id, "impressora sem papel");

    // continua pendente: é o que garante que o pedido não se perde
    const fila = await nextPrintJobs(5);
    expect(fila).toHaveLength(1);
    expect(fila[0].attempts).toBe(1);
  });

  it("desiste após o limite, para não travar a fila para sempre", async () => {
    const id = await enqueuePrintJob(null, "cupom problemático");

    for (let i = 0; i < 5; i++) {
      await markPrintJobFailed(id, "erro", 5);
    }

    expect(await nextPrintJobs(5)).toHaveLength(0);
    expect((await getPrintQueueStatus()).failed).toBe(1);
  });

  it("permite reenfileirar o que falhou", async () => {
    const id = await enqueuePrintJob(null, "cupom");
    for (let i = 0; i < 5; i++) await markPrintJobFailed(id, "erro", 5);

    const reenfileirados = await retryFailedPrintJobs();

    expect(reenfileirados).toBe(1);
    const fila = await nextPrintJobs(5);
    expect(fila).toHaveLength(1);
    // as tentativas zeram, senão ele falharia de novo na primeira
    expect(fila[0].attempts).toBe(0);
  });

  it("informa a situação para o painel", async () => {
    await enqueuePrintJob(null, "a");
    await enqueuePrintJob(null, "b");

    expect(await getPrintQueueStatus()).toEqual({ pending: 2, failed: 0 });
  });
});

describe("enfileiramento automático", () => {
  beforeEach(limparFila);

  async function fazerPedido() {
    const caller = appRouter.createCaller(publicCtx());
    const produtos = await caller.products.available();
    const produto = produtos.find(p => p.unit === "kg")!;

    return caller.orders.create({
      items: [{ productId: produto.id, quantity: 1000, cutTypeName: "Bifes" }],
      customerName: "Cliente Teste",
      customerPhone: "18991363710",
      deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
      paymentMethod: "pix",
    });
  }

  it("enfileira o cupom quando a impressão automática está ligada", async () => {
    await setOrderAlerts({ notify: true, autoPrint: true, receiptWidth: "80mm" });

    const { orderId } = await fazerPedido();
    const fila = await nextPrintJobs(5);

    expect(fila).toHaveLength(1);
    expect(fila[0].orderId).toBe(orderId);
    // o cupom já vai pronto: o agente não precisa saber montar nada
    expect(fila[0].content).toContain(`PEDIDO #${orderId}`);
    expect(fila[0].content).toContain(">> CORTE: BIFES");
    expect(fila[0].content).toContain("DADOS PARA ENTREGA");
  });

  it("não enfileira nada com a impressão automática desligada", async () => {
    await setOrderAlerts({ notify: true, autoPrint: false, receiptWidth: "80mm" });

    await fazerPedido();

    expect(await nextPrintJobs(5)).toHaveLength(0);
  });

  it("o pedido é criado mesmo se o cupom não puder ser enfileirado", async () => {
    // a impressão é conveniência; derrubar o checkout do cliente por causa
    // dela seria trocar um problema pequeno por um grande
    await setOrderAlerts({ notify: true, autoPrint: true, receiptWidth: "80mm" });

    const { success, orderId } = await fazerPedido();

    expect(success).toBe(true);
    expect(orderId).toBeGreaterThan(0);
  });
});

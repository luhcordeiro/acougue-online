import { buildReceipt, formatDate, type ReceiptItem, type ReceiptOrder } from "@shared/receipt";
import { describe, expect, it } from "vitest";

/**
 * O mesmo cupom é montado no navegador do painel e dentro do Worker, que roda
 * em UTC. Antes destes testes o mesmo pedido imprimia com três horas de
 * diferença conforme o caminho — e é o papel que diz ao açougueiro a ordem
 * dos pedidos.
 */
describe("hora do cupom", () => {
  it("usa o fuso da loja, não o de quem monta o cupom", () => {
    // 21:30 UTC = 18:30 em São Paulo
    expect(formatDate(new Date("2026-09-02T21:30:00Z"))).toBe("02/09/2026 18:30");
  });

  it("vira o dia pelo fuso da loja", () => {
    // 01:00 UTC do dia 3 ainda é 22:00 do dia 2 no Brasil
    expect(formatDate(new Date("2026-09-03T01:00:00Z"))).toBe("02/09/2026 22:00");
  });

  it("aceita data em texto, como vem do banco", () => {
    expect(formatDate("2026-09-02T21:30:00.000Z")).toBe("02/09/2026 18:30");
  });

  it("não quebra o cupom com data inválida", () => {
    expect(formatDate("nem data")).toBe("-");
  });

  it("imprime a hora da loja no cupom", () => {
    const pedido: ReceiptOrder = {
      id: 1,
      createdAt: new Date("2026-09-02T21:30:00Z"),
      customerName: "Teste",
      customerPhone: "18991363710",
      deliveryAddress: "Rua A, 1 - Centro",
      paymentMethod: "pix",
      totalAmount: 1000,
    };
    const itens: ReceiptItem[] = [
      { productName: "Acem", quantity: 1000, unit: "kg", price: 1000, subtotal: 1000 },
    ];

    const cupom = buildReceipt(pedido, itens);
    expect(cupom).toContain("02/09/2026 18:30");
    expect(cupom).not.toContain("21:30");
  });
});

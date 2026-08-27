import { type ReceiptItem, type ReceiptOrder } from "@shared/receipt";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  toWhatsAppNumber,
} from "@shared/whatsapp";
import { describe, expect, it } from "vitest";

const pedido: ReceiptOrder = {
  id: 42,
  createdAt: new Date("2026-08-25T15:42:00"),
  customerName: "Maria Silva Souza",
  customerPhone: "(18) 99136-3710",
  deliveryAddress: "Rua das Flores, 123 - Centro",
  deliveryStreet: "Rua das Flores",
  deliveryNumber: "123",
  deliveryNeighborhood: "Centro",
  paymentMethod: "pix",
  totalAmount: 7497,
};

const itens: ReceiptItem[] = [
  {
    productName: "Acem",
    cutTypeName: "Bifes",
    quantity: 1500,
    unit: "kg",
    price: 3198,
    subtotal: 4797,
  },
  {
    productName: "Achocolatado 370gr",
    quantity: 2,
    unit: "un",
    price: 1100,
    subtotal: 2200,
  },
];

describe("numero para o WhatsApp", () => {
  it("acrescenta o DDI ao celular com DDD", () => {
    expect(toWhatsAppNumber("(18) 99136-3710")).toBe("5518991363710");
  });

  it("acrescenta o DDI ao fixo com DDD", () => {
    expect(toWhatsAppNumber("18 3654-1122")).toBe("551836541122");
  });

  it("não duplica o DDI de quem já digitou o +55", () => {
    expect(toWhatsAppNumber("+55 18 99136-3710")).toBe("5518991363710");
  });

  it("trata DDD 55 como DDD, não como DDI", () => {
    // "55999998888" é um celular do Rio Grande do Sul, não um número com DDI:
    // decidir por "começa com 55" mandaria a mensagem para o número errado
    expect(toWhatsAppNumber("(55) 99999-8888")).toBe("5555999998888");
  });

  it("recusa o que não é telefone, em vez de abrir conversa vazia", () => {
    expect(toWhatsAppNumber("99999")).toBeNull();
    expect(toWhatsAppNumber("")).toBeNull();
  });
});

describe("mensagem do WhatsApp", () => {
  const mensagem = buildWhatsAppMessage(pedido, itens, { deliveryFee: 500 });

  it("chama o cliente pelo primeiro nome", () => {
    expect(mensagem).toContain("Olá, Maria!");
    expect(mensagem).not.toContain("Maria Silva Souza");
  });

  it("não grita com quem cadastrou o nome em maiúsculas", () => {
    const gritado = buildWhatsAppMessage(
      { ...pedido, customerName: "LUCIANA PATRICIA CORDEIRO" },
      itens
    );
    expect(gritado).toContain("Olá, Luciana!");
  });

  it("preserva o nome já digitado em caixa mista", () => {
    const daSilva = buildWhatsAppMessage(
      { ...pedido, customerName: "McDonald Souza" },
      itens
    );
    expect(daSilva).toContain("Olá, McDonald!");
  });

  it("identifica o pedido", () => {
    expect(mensagem).toContain("*#42*");
  });

  it("lista cada item com quantidade e corte", () => {
    expect(mensagem).toContain("1,5 kg — Acem (Bifes) — R$ 47,97");
    expect(mensagem).toContain("2 un — Achocolatado 370gr — R$ 22,00");
  });

  it("soma a entrega ao total, como o cliente viu no carrinho", () => {
    expect(mensagem).toContain("Entrega: R$ 5,00");
    expect(mensagem).toContain("*Total: R$ 74,97*");
  });

  it("omite a taxa quando não há entrega a cobrar", () => {
    const semTaxa = buildWhatsAppMessage(pedido, itens);

    // "Entrega: R$ 0,00" faz o cliente perguntar o que é essa linha
    expect(semTaxa).not.toContain("Entrega: R$ 0,00");
    expect(semTaxa).toContain("*Total: R$ 69,97*");
  });

  it("informa o troco só quando o pagamento é em dinheiro", () => {
    const dinheiro = buildWhatsAppMessage(
      { ...pedido, paymentMethod: "cash", changeFor: 10000 },
      itens
    );
    expect(dinheiro).toContain("Troco para: R$ 100,00");
    expect(mensagem).not.toContain("Troco");
  });

  it("monta o endereço a partir das partes", () => {
    expect(mensagem).toContain("Entrega em: Rua das Flores, 123 - Centro");
  });

  it("usa o endereço antigo nos pedidos anteriores à separação", () => {
    const antigo = buildWhatsAppMessage(
      { ...pedido, deliveryStreet: null, deliveryNumber: null, deliveryNeighborhood: null },
      itens
    );
    expect(antigo).toContain("Entrega em: Rua das Flores, 123 - Centro");
  });

  it("repassa a observação do cliente", () => {
    const comNota = buildWhatsAppMessage({ ...pedido, notes: "Sem osso" }, itens);
    expect(comNota).toContain("Observação: Sem osso");
  });

  it("não carrega os marcadores do cupom térmico", () => {
    // no WhatsApp os caracteres de controle apareceriam como lixo
    expect(mensagem).not.toMatch(/[]/);
  });
});

describe("link do WhatsApp", () => {
  it("aponta para o número do cliente com o texto pronto", () => {
    const url = buildWhatsAppUrl(pedido, itens, { storeName: "Texas Bife" });

    expect(url).toBeTruthy();
    expect(url!.startsWith("https://wa.me/5518991363710?text=")).toBe(true);

    const texto = decodeURIComponent(url!.split("?text=")[1]);
    expect(texto).toContain("Texas Bife");
    expect(texto).toContain("*#42*");
  });

  it("escapa a quebra de linha, senão o link chega truncado", () => {
    const url = buildWhatsAppUrl(pedido, itens)!;
    expect(url).not.toContain("\n");
    expect(url).toContain("%0A");
  });

  it("não gera link quando o telefone não serve", () => {
    expect(buildWhatsAppUrl({ ...pedido, customerPhone: "123" }, itens)).toBeNull();
  });
});

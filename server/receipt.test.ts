import {
  buildReceipt,
  formatPhone,
  MARK_EMPHASIS_ON,
  RECEIPT_WIDTHS,
  stripMarkers,
  wrap,
  type ReceiptItem,
  type ReceiptOrder,
} from "@shared/receipt";
import { describe, expect, it } from "vitest";

const pedido: ReceiptOrder = {
  id: 42,
  createdAt: new Date("2026-08-25T15:42:00"),
  customerName: "Maria Silva",
  customerPhone: "18991363710",
  deliveryAddress: "Rua das Flores, 123 - Centro, proximo ao mercado",
  paymentMethod: "pix",
  notes: "Sem osso por favor",
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

/** Largura real no papel: marcador de destaque é comando, não caractere. */
function larguraImpressa(cupom: string): number {
  return Math.max(
    ...cupom.split(String.fromCharCode(10)).map(l => stripMarkers(l).length)
  );
}

describe("cupom", () => {
  const cupom = buildReceipt(pedido, itens, { deliveryFee: 500 });

  it("respeita a largura da bobina", () => {
    for (const largura of ["58mm", "80mm"] as const) {
      const texto = buildReceipt(pedido, itens, { width: largura });

      // mede o que sai no PAPEL: os marcadores de destaque são comandos da
      // impressora, não caracteres impressos. Contando com eles, toda linha
      // destacada pareceria dois caracteres mais larga do que é.
      const maior = larguraImpressa(texto);

      // passar da largura faz a térmica quebrar a linha no lugar errado
      expect(maior).toBeLessThanOrEqual(RECEIPT_WIDTHS[largura]);
    }
  });

  it("não estoura a bobina com nome de produto comprido", () => {
    // o catálogo real tem nomes longos, e o nome sai destacado — é o caso em
    // que a linha chega perto do limite
    const comprido: ReceiptItem[] = [
      {
        ...itens[0],
        productName: "Carvao Santana 3kg Pequeno Embalagem Economica Especial",
        cutTypeName: "Peca Inteira Sem Osso Limpa",
      },
    ];

    for (const largura of ["58mm", "80mm"] as const) {
      const texto = buildReceipt(pedido, comprido, { width: largura });
      expect(larguraImpressa(texto)).toBeLessThanOrEqual(RECEIPT_WIDTHS[largura]);
    }
  });

  it("quantidade e valor grandes cabem na bobina estreita", () => {
    const pesado: ReceiptItem[] = [
      { ...itens[0], quantity: 50000, price: 12998, subtotal: 649900 },
    ];

    const texto = buildReceipt(pedido, pesado, { width: "58mm" });
    expect(larguraImpressa(texto)).toBeLessThanOrEqual(RECEIPT_WIDTHS["58mm"]);
  });

  it("traz o corte destacado, que é o que guia o preparo", () => {
    expect(cupom).toContain(">> CORTE: BIFES");
  });

  it("mostra quantidade e preço na unidade certa de cada item", () => {
    // quantidade e preço ficam em linhas separadas: a quantidade sai
    // destacada, e no meio da linha de preço ela se perdia
    expect(stripMarkers(cupom)).toContain(">> QTD: 1,5 kg");
    expect(stripMarkers(cupom)).toContain("R$ 31,98/kg");
    expect(stripMarkers(cupom)).toContain(">> QTD: 2 un");
    expect(stripMarkers(cupom)).toContain("R$ 11,00/un");
  });

  it("fecha a conta com a taxa de entrega", () => {
    expect(cupom).toContain("Subtotal");
    expect(cupom).toContain("R$ 69,97"); // 47,97 + 22,00
    expect(cupom).toContain("Taxa de entrega");
    expect(cupom).toContain("R$ 5,00");
    expect(cupom).toContain("R$ 74,97"); // total
  });

  it("traz os dados de entrega para o motoboy", () => {
    expect(cupom).toContain("DADOS PARA ENTREGA");
    expect(cupom).toContain("MARIA SILVA");
    expect(cupom).toContain("(18) 99136-3710");
    expect(cupom).toContain("Rua das Flores, 123");
    expect(cupom).toContain("Sem osso por favor");
  });

  it("avisa que não é documento fiscal", () => {
    expect(cupom).toContain("NAO E DOCUMENTO FISCAL");
  });

  it("calcula o troco em vez de deixar a conta para o motoboy", () => {
    const dinheiro = buildReceipt(
      { ...pedido, paymentMethod: "cash", changeFor: 10000 },
      itens
    );

    expect(dinheiro).toContain("Troco para");
    expect(dinheiro).toContain("R$ 100,00");
    expect(dinheiro).toContain("LEVAR TROCO DE");
    expect(dinheiro).toContain("R$ 25,03"); // 100,00 - 74,97
  });

  it("omite o troco quando não é pagamento em dinheiro", () => {
    expect(cupom).not.toContain("LEVAR TROCO");
  });

  it("omite a taxa quando a entrega é gratuita", () => {
    const semTaxa = buildReceipt(pedido, itens, { deliveryFee: 0 });
    expect(semTaxa).not.toContain("Taxa de entrega");
  });

  it("não escreve linha de corte em item sem corte", () => {
    const soMercearia = buildReceipt(pedido, [itens[1]]);
    expect(soMercearia).not.toContain("CORTE:");
  });
});

describe("destaque do produto", () => {
  const cupom = buildReceipt(pedido, itens, { deliveryFee: 500 });

  it("marca o nome, o corte e a quantidade", () => {
    const linhas = cupom.split(String.fromCharCode(10));

    const nome = linhas.find(l => stripMarkers(l).trim() === "ACEM");
    const corte = linhas.find(l => stripMarkers(l).includes("CORTE: BIFES"));
    const qtd = linhas.find(l => stripMarkers(l).includes("QTD: 1,5 kg"));

    // as três coisas que o açougueiro precisa ler de relance para preparar
    expect(nome).toContain(MARK_EMPHASIS_ON);
    expect(corte).toContain(MARK_EMPHASIS_ON);
    expect(qtd).toContain(MARK_EMPHASIS_ON);
  });

  it("não marca a linha de preço", () => {
    const linha = cupom
      .split(String.fromCharCode(10))
      .find(l => stripMarkers(l).includes("R$ 31,98/kg"));

    // o preço é conferência, não preparo; destacar tudo tira o destaque de tudo
    expect(linha).toBeDefined();
    expect(linha).not.toContain(MARK_EMPHASIS_ON);
  });

  it("não marca os dados de entrega", () => {
    const linha = cupom.split(String.fromCharCode(10)).find(l => l.includes("(18) 99136-3710"));
    expect(linha).not.toContain(MARK_EMPHASIS_ON);
  });

  it("stripMarkers devolve o texto limpo", () => {
    expect(stripMarkers(cupom)).not.toContain(MARK_EMPHASIS_ON);
    expect(stripMarkers(cupom)).toContain("ACEM");
  });
});

describe("quebra de linha", () => {
  it("quebra por palavra, não no meio dela", () => {
    expect(wrap("Rua das Flores 123 Centro", 12)).toEqual([
      "Rua das",
      "Flores 123",
      "Centro",
    ]);
  });

  it("parte palavra maior que a linha inteira", () => {
    const linhas = wrap("SUPERCALIFRAGILISTICO", 10);
    expect(linhas.every(l => l.length <= 10)).toBe(true);
    expect(linhas.join("")).toBe("SUPERCALIFRAGILISTICO");
  });

  it("respeita a largura mesmo com endereço longo", () => {
    const longo = buildReceipt(
      {
        ...pedido,
        deliveryAddress:
          "Avenida Presidente Getulio Dornelles Vargas, 4567, apartamento 1203, bloco B, Jardim das Palmeiras",
      },
      itens,
      { width: "58mm" }
    );

    expect(larguraImpressa(longo)).toBeLessThanOrEqual(32);
  });
});

describe("larguras extremas", () => {
  it("nunca estoura a bobina, nem com nome, preco e endereco longos", () => {
    const texto = buildReceipt(
      {
        ...pedido,
        customerName: "Maria Aparecida dos Santos Oliveira Rodrigues",
        deliveryAddress:
          "Avenida Presidente Getulio Dornelles Vargas, 4567, apartamento 1203, bloco B",
        notes: "Favor cortar bem fino e embalar separado cada tipo de carne",
        totalAmount: 1234567,
        paymentMethod: "cash",
        changeFor: 2000000,
      },
      [
        {
          productName: "Costela Desossada e Recheada com Farofa Especial da Casa",
          cutTypeName: "Peca Inteira Sem Osso e Sem Gordura",
          quantity: 49000,
          unit: "kg",
          price: 999999,
          subtotal: 1234567,
        },
      ],
      { width: "58mm", deliveryFee: 12345 }
    );

    const maior = Math.max(
      ...stripMarkers(texto).split(String.fromCharCode(10)).map(l => l.length)
    );
    expect(maior).toBeLessThanOrEqual(32);
  });
});

describe("telefone", () => {
  it("formata celular e fixo", () => {
    expect(formatPhone("18991363710")).toBe("(18) 99136-3710");
    expect(formatPhone("1832216677")).toBe("(18) 3221-6677");
  });

  it("devolve como veio quando não reconhece", () => {
    expect(formatPhone("123")).toBe("123");
  });
});

/**
 * Cupom não fiscal para impressora térmica.
 *
 * Saída em texto puro, largura fixa, sem HTML: é o que a térmica entende bem.
 * A separação em duas partes é proposital — em cima o que o açougueiro precisa
 * para preparar (produto, corte, quantidade), embaixo o que o motoboy precisa
 * para entregar (cliente, telefone, endereço, pagamento).
 *
 * O corte aparece em linha própria e destacada: é a informação que, se passar
 * despercebida, faz o pedido inteiro sair errado.
 */

import { formatQuantity, type SaleUnit } from "./quantity";

/**
 * Marcadores de destaque.
 *
 * O cupom continua sendo texto puro — quem entende de impressora é o agente,
 * que troca estes caracteres de controle pelos comandos ESC/POS. Assim a
 * prévia na tela e a impressão pelo navegador seguem funcionando sem saber
 * nada de ESC/POS.
 *
 * São caracteres de controle (SOH e STX) justamente por não aparecerem em
 * nome de produto nem em endereço.
 */
export const MARK_EMPHASIS_ON = "";
export const MARK_EMPHASIS_OFF = "";

/** Destaca uma linha inteira: negrito e altura dupla na térmica. */
function emphasize(text: string): string {
  return `${MARK_EMPHASIS_ON}${text}${MARK_EMPHASIS_OFF}`;
}

/** Remove os marcadores, para exibir na tela ou medir a largura real. */
export function stripMarkers(text: string): string {
  return text.split(MARK_EMPHASIS_ON).join("").split(MARK_EMPHASIS_OFF).join("");
}

/** Colunas por largura de bobina: 58mm imprime 32, 80mm imprime 48. */
export const RECEIPT_WIDTHS = { "58mm": 32, "80mm": 48 } as const;

export type ReceiptWidth = keyof typeof RECEIPT_WIDTHS;

export type ReceiptItem = {
  productName: string;
  cutTypeName?: string | null;
  quantity: number;
  unit: SaleUnit;
  price: number;
  subtotal: number;
};

export type ReceiptOrder = {
  id: number;
  createdAt: Date | string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  /** Partes do endereço; nulas nos pedidos anteriores à separação. */
  deliveryStreet?: string | null;
  deliveryNumber?: string | null;
  deliveryNeighborhood?: string | null;
  paymentMethod: "card" | "pix" | "cash";
  changeFor?: number | null;
  notes?: string | null;
  totalAmount: number;
};

export type ReceiptOptions = {
  storeName?: string;
  width?: ReceiptWidth;
  /** Taxa em centavos; separada para o total bater com o que o cliente viu. */
  deliveryFee?: number;
};

const PAYMENT_LABELS: Record<ReceiptOrder["paymentMethod"], string> = {
  pix: "PIX",
  card: "CARTAO",
  cash: "DINHEIRO",
};

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

/** (18) 99136-3710 — telefone sem formatação é ruim de ler no cupom. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Quebra por palavra: cortar no meio da palavra atrapalha a leitura rápida.
 *
 * Não trata recuo: quem precisa de recuo passa a largura já descontada e
 * prefixa as linhas. Tentar embutir isso aqui foi o que fez a linha do
 * endereço estourar a bobina.
 */
export function wrap(text: string, width: number): string[] {
  const palavras = text.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;

    if (candidata.length <= width) {
      atual = candidata;
      continue;
    }

    if (atual) linhas.push(atual);

    // palavra maior que a linha inteira: aí não há como não partir
    let resto = palavra;
    while (resto.length > width) {
      linhas.push(resto.slice(0, width));
      resto = resto.slice(width);
    }
    atual = resto;
  }

  if (atual) linhas.push(atual);
  return linhas.length > 0 ? linhas : [""];
}

/**
 * "Total" à esquerda, valor à direita, preenchendo o meio.
 *
 * Quando os dois não cabem na mesma linha, o valor desce alinhado à direita:
 * juntar tudo numa linha só estouraria a bobina e a térmica quebraria no
 * lugar errado, deixando o valor ilegível.
 */
function pair(left: string, right: string, width: number): string[] {
  const espaco = width - left.length - right.length;
  if (espaco >= 1) return [left + " ".repeat(espaco) + right];

  const linhas = wrap(left, width);
  linhas.push(right.padStart(width).slice(-width));
  return linhas;
}

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const antes = Math.floor((width - text.length) / 2);
  return " ".repeat(antes) + text;
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const d = (n: number) => String(n).padStart(2, "0");
  return `${d(date.getDate())}/${d(date.getMonth() + 1)}/${date.getFullYear()} ${d(date.getHours())}:${d(date.getMinutes())}`;
}

export function buildReceipt(
  order: ReceiptOrder,
  items: ReceiptItem[],
  { storeName = "ACOUGUE ONLINE", width = "80mm", deliveryFee = 0 }: ReceiptOptions = {}
): string {
  const w = RECEIPT_WIDTHS[width];
  const forte = "=".repeat(w);
  const fraco = "-".repeat(w);
  const linhas: string[] = [];

  linhas.push(forte);
  linhas.push(center(storeName.toUpperCase(), w));
  linhas.push(forte);
  linhas.push(...pair(`PEDIDO #${order.id}`, formatDate(order.createdAt), w));
  linhas.push(fraco);
  linhas.push("ITENS DO PEDIDO");
  linhas.push(fraco);

  for (const item of items) {
    // Nome e corte saem maiores e em negrito: é o que o açougueiro lê de
    // relance ao preparar, muitas vezes com o papel na mão e sem parar.
    for (const linha of wrap(item.productName.toUpperCase(), w)) {
      linhas.push(emphasize(linha));
    }

    // o corte guia o preparo: fica em linha própria, marcado
    if (item.cutTypeName) {
      for (const linha of wrap(`>> CORTE: ${item.cutTypeName.toUpperCase()}`, w - 2)) {
        linhas.push(emphasize(`  ${linha}`));
      }
    }

    const medida = `  ${formatQuantity(item.quantity, item.unit)} x ${money(item.price)}/${item.unit}`;
    linhas.push(...pair(medida, money(item.subtotal), w));
    linhas.push("");
  }

  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);

  linhas.push(fraco);
  linhas.push(...pair("Subtotal", money(subtotal), w));
  if (deliveryFee > 0) {
    linhas.push(...pair("Taxa de entrega", money(deliveryFee), w));
  }
  linhas.push(...pair("TOTAL", money(order.totalAmount), w));
  linhas.push(fraco);
  linhas.push(...pair("PAGAMENTO", PAYMENT_LABELS[order.paymentMethod], w));

  if (order.paymentMethod === "cash" && order.changeFor) {
    linhas.push(...pair("  Troco para", money(order.changeFor), w));
    // o motoboy precisa do valor já calculado, não da conta para fazer
    linhas.push(...pair("  LEVAR TROCO DE", money(order.changeFor - order.totalAmount), w));
  }

  linhas.push("");
  linhas.push(forte);
  linhas.push(center("DADOS PARA ENTREGA", w));
  linhas.push(forte);
  linhas.push("CLIENTE:");
  for (const linha of wrap(order.customerName.toUpperCase(), w - 2)) {
    linhas.push(`  ${linha}`);
  }
  linhas.push(`FONE: ${formatPhone(order.customerPhone)}`);
  linhas.push("ENDERECO:");

  // Com as partes separadas o bairro ganha linha própria: é o que o entregador
  // lê primeiro para decidir a rota. Pedido antigo só tem o endereço montado.
  if (order.deliveryStreet && order.deliveryNumber) {
    const rua = `${order.deliveryStreet}, ${order.deliveryNumber}`;
    for (const linha of wrap(rua, w - 2)) linhas.push(`  ${linha}`);

    if (order.deliveryNeighborhood) {
      for (const linha of wrap(`BAIRRO: ${order.deliveryNeighborhood.toUpperCase()}`, w - 2)) {
        linhas.push(`  ${linha}`);
      }
    }
  } else {
    for (const linha of wrap(order.deliveryAddress, w - 2)) {
      linhas.push(`  ${linha}`);
    }
  }

  if (order.notes) {
    linhas.push("");
    linhas.push("OBSERVACOES:");
    for (const linha of wrap(order.notes, w - 2)) {
      linhas.push(`  ${linha}`);
    }
  }

  linhas.push(forte);
  linhas.push(center("*** NAO E DOCUMENTO FISCAL ***", w));
  linhas.push("");

  return linhas.join("\n");
}

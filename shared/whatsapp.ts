/**
 * Mensagem de confirmação do pedido pelo WhatsApp.
 *
 * O envio é manual: o operador do balcão clica no botão, o WhatsApp abre com
 * o número do cliente e o texto pronto, e ele confere antes de enviar. Não há
 * integração com a API do WhatsApp — nada é enviado sozinho.
 *
 * Esta mensagem é para o cliente, e por isso não reaproveita o cupom: o cupom
 * é para o balcão (corte, preparo, dados do motoboy) e é montado em largura
 * fixa com caracteres de controle, que no WhatsApp só apareceriam como lixo.
 */

import { formatPhone, type ReceiptItem, type ReceiptOrder } from "./receipt";
import { formatQuantity } from "./quantity";

const PAYMENT_LABELS: Record<ReceiptOrder["paymentMethod"], string> = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro",
};

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

/** DDI padrão. O açougue atende Penápolis-SP; ninguém digita o +55. */
const DDI_BRASIL = "55";

/**
 * Converte o telefone do cliente para o formato que o wa.me exige:
 * só dígitos, com DDI na frente.
 *
 * Retorna null quando o número não tem cara de telefone — melhor desabilitar
 * o botão do que abrir o WhatsApp num número inexistente.
 *
 * O DDI só é acrescentado em número de 10 ou 11 dígitos (fixo e celular com
 * DDD). Não dá para decidir por "começa com 55": o DDD 55 é do Rio Grande do
 * Sul, então "55999998888" é um celular local de 11 dígitos, não um número
 * que já veio com DDI.
 */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");

  // 10 = fixo com DDD, 11 = celular com DDD
  if (digits.length === 10 || digits.length === 11) {
    return DDI_BRASIL + digits;
  }

  // 12 ou 13 dígitos já trazem o DDI
  if (digits.length === 12 || digits.length === 13) {
    return digits;
  }

  return null;
}

/**
 * Primeiro nome em caixa de título.
 *
 * Os clientes costumam digitar o nome todo em maiúsculas, e "Olá, LUCIANA!"
 * soa como grito na conversa. Nome já digitado em caixa mista fica como está.
 */
function greetingName(fullName: string): string {
  const primeiro = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!primeiro) return "";

  const misto = primeiro !== primeiro.toUpperCase() && primeiro !== primeiro.toLowerCase();
  if (misto) return primeiro;

  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

function itemLine(item: ReceiptItem): string {
  const quantidade = formatQuantity(item.quantity, item.unit);
  const corte = item.cutTypeName ? ` (${item.cutTypeName})` : "";
  return `• ${quantidade} — ${item.productName}${corte} — ${money(item.subtotal)}`;
}

function addressLine(order: ReceiptOrder): string {
  // Pedidos antigos não têm o endereço separado em partes
  if (!order.deliveryStreet) return order.deliveryAddress;

  const numero = order.deliveryNumber ? `, ${order.deliveryNumber}` : "";
  const bairro = order.deliveryNeighborhood ? ` - ${order.deliveryNeighborhood}` : "";
  return `${order.deliveryStreet}${numero}${bairro}`;
}

export type WhatsAppOptions = {
  storeName?: string;
  /** Taxa em centavos; somada ao total, como o cliente viu no carrinho. */
  deliveryFee?: number;
};

/**
 * Monta o texto da confirmação.
 *
 * Usa o *negrito* do WhatsApp com moderação: só o que o cliente procura de
 * relance ao abrir a conversa (o número do pedido e o total).
 */
export function buildWhatsAppMessage(
  order: ReceiptOrder,
  items: ReceiptItem[],
  options: WhatsAppOptions = {}
): string {
  const { storeName = "Texas Bife", deliveryFee = 0 } = options;

  const produtos = items.reduce((soma, item) => soma + item.subtotal, 0);
  const partes: string[] = [];

  partes.push(`Olá, ${greetingName(order.customerName)}! Aqui é do *${storeName}*.`);
  partes.push("");
  partes.push(`Recebemos o seu pedido *#${order.id}* e já estamos preparando:`);
  partes.push("");
  items.forEach(item => partes.push(itemLine(item)));
  partes.push("");

  // A taxa só aparece quando existe: linha "Entrega: R$ 0,00" gera dúvida
  if (deliveryFee > 0) {
    partes.push(`Produtos: ${money(produtos)}`);
    partes.push(`Entrega: ${money(deliveryFee)}`);
  }

  partes.push(`*Total: ${money(produtos + deliveryFee)}*`);
  partes.push(`Pagamento: ${PAYMENT_LABELS[order.paymentMethod]}`);

  if (order.paymentMethod === "cash" && order.changeFor) {
    partes.push(`Troco para: ${money(order.changeFor)}`);
  }

  partes.push("");
  partes.push(`Entrega em: ${addressLine(order)}`);

  if (order.notes) {
    partes.push(`Observação: ${order.notes}`);
  }

  partes.push("");
  partes.push("Qualquer dúvida é só chamar por aqui. Obrigado pela preferência!");

  return partes.join("\n");
}

/**
 * Link que abre a conversa com o cliente e o texto já digitado.
 *
 * O wa.me resolve sozinho para onde mandar: no celular abre o aplicativo, no
 * computador do balcão abre o WhatsApp Desktop ou o Web, conforme o que
 * estiver instalado. Nada é enviado — quem aperta enviar é o operador.
 *
 * Retorna null quando o telefone do cliente não é utilizável.
 */
export function buildWhatsAppUrl(
  order: ReceiptOrder,
  items: ReceiptItem[],
  options: WhatsAppOptions = {}
): string | null {
  const numero = toWhatsAppNumber(order.customerPhone);
  if (!numero) return null;

  const texto = buildWhatsAppMessage(order, items, options);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Telefone formatado para mostrar no aviso quando o número não serve. */
export { formatPhone };

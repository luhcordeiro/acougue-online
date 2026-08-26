/**
 * Unidade de venda, quantidade e preço.
 *
 * Um produto é vendido a peso ("kg") ou por peça ("un"), e isso muda como a
 * quantidade é guardada e como o subtotal é calculado. Tudo passa por aqui
 * para não existir uma segunda fórmula de preço espalhada pelo código.
 *
 * Quantidade é sempre inteira:
 *  - unit "kg" -> gramas   (1500 = 1,5 kg)
 *  - unit "un" -> peças    (3 = 3 unidades)
 */

export type SaleUnit = "kg" | "un";

export const SALE_UNITS: SaleUnit[] = ["kg", "un"];

/**
 * Quantidades oferecidas quando o açougue ainda não cadastrou nenhuma.
 *
 * Sem esse conjunto, desligar a quantidade livre impediria qualquer venda a
 * quilo até alguém cadastrar as opções.
 */
export const DEFAULT_QUICK_QUANTITIES = [500, 1000, 1500, 2000];

/** Limites por item, para evitar 0 por engano e mil quilos por dedo pesado. */
export const MIN_ITEM_GRAMS = 100;
export const MAX_ITEM_GRAMS = 50_000;
export const MIN_ITEM_UNITS = 1;
export const MAX_ITEM_UNITS = 500;

export function minQuantity(unit: SaleUnit): number {
  return unit === "kg" ? MIN_ITEM_GRAMS : MIN_ITEM_UNITS;
}

export function maxQuantity(unit: SaleUnit): number {
  return unit === "kg" ? MAX_ITEM_GRAMS : MAX_ITEM_UNITS;
}

/**
 * Subtotal em centavos.
 *
 * A peso o preço é por quilo, então divide por 1000; por peça é multiplicação
 * direta. O arredondamento fica no fim, sobre o total do item.
 */
export function calcSubtotal(
  unit: SaleUnit,
  price: number,
  quantity: number
): number {
  if (unit === "un") return price * quantity;
  return Math.round((price * quantity) / 1000);
}

/**
 * Quantidade para leitura humana.
 *
 * Não usa toFixed: com quantidade livre, `(250/1000).toFixed(1)` mostraria
 * "0.3 kg" para 250 g. Abaixo de 1 kg exibimos em gramas, e acima o String()
 * já descarta zeros à direita sem comer o zero de "10".
 *
 * kg: 250 -> "250 g" | 1500 -> "1,5 kg" | 10000 -> "10 kg"
 * un: 1 -> "1 un" | 3 -> "3 un"
 */
export function formatQuantity(quantity: number, unit: SaleUnit = "kg"): string {
  if (!Number.isFinite(quantity)) return "-";
  if (unit === "un") return `${Math.round(quantity)} un`;
  if (quantity < 1000) return `${Math.round(quantity)} g`;
  return `${String(quantity / 1000).replace(".", ",")} kg`;
}

/** "R$ 41,98/kg" ou "R$ 3,50/un" */
export function formatPrice(price: number, unit: SaleUnit = "kg"): string {
  return `R$ ${(price / 100).toFixed(2).replace(".", ",")}/${unit}`;
}

/** Rótulo da unidade para formulários. */
export function unitLabel(unit: SaleUnit): string {
  return unit === "kg" ? "Quilo (fracionado)" : "Unidade";
}

/** Aceita "1,5" e "1.5": o cliente digita como fala. */
export function parseKgInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (normalized === "") return NaN;
  return parseFloat(normalized);
}

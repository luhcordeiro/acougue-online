/**
 * Quantidade dos itens do pedido.
 *
 * Tudo é guardado em gramas (inteiro) para não acumular erro de ponto
 * flutuante em cima do preço por quilo.
 */

/** Evita pedido de 0g por engano e de 1000kg por dedo pesado. */
export const MIN_ITEM_GRAMS = 100;
export const MAX_ITEM_GRAMS = 50_000;

/**
 * Formata para leitura humana.
 *
 * Não usa toFixed: com quantidade livre, `(250/1000).toFixed(1)` mostraria
 * "0.3 kg" para 250 g. Abaixo de 1 kg exibimos em gramas, e acima o String()
 * já descarta zeros à direita sem comer o zero de "10".
 *
 * 250 -> "250 g" | 1500 -> "1,5 kg" | 10000 -> "10 kg"
 */
export function formatQuantity(grams: number): string {
  if (!Number.isFinite(grams)) return "-";
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${String(grams / 1000).replace(".", ",")} kg`;
}

/** Aceita "1,5" e "1.5": o cliente digita como fala. */
export function parseKgInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (normalized === "") return NaN;
  return parseFloat(normalized);
}

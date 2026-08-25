import { calcSubtotal, type SaleUnit } from "@shared/quantity";

const STORAGE_KEY = "cart";

export type CartItem = {
  productId: number;
  productName: string;
  /** Centavos pela unidade de venda (por quilo ou por peça). */
  price: number;
  unit: SaleUnit;
  /** Gramas quando unit = "kg"; peças quando unit = "un". */
  quantity: number;
  imageUrl?: string | null;
  cutTypeName?: string;
};

/**
 * Formato antigo, de quando tudo era vendido a peso.
 *
 * Um cliente pode ter deixado o carrinho aberto antes da atualização, e
 * descartar o carrinho dele por causa de uma mudança nossa seria pior do que
 * converter. A conversão some sozinha conforme os carrinhos são finalizados.
 */
type LegacyCartItem = {
  productId: number;
  productName: string;
  pricePerKg: number;
  quantityGrams: number;
  imageUrl?: string | null;
  cutTypeName?: string;
};

function migrate(raw: CartItem | LegacyCartItem): CartItem | null {
  if ("price" in raw && "quantity" in raw) {
    return { ...raw, unit: raw.unit ?? "kg" };
  }

  const legacy = raw as LegacyCartItem;
  if (typeof legacy.pricePerKg !== "number" || typeof legacy.quantityGrams !== "number") {
    return null;
  }

  return {
    productId: legacy.productId,
    productName: legacy.productName,
    price: legacy.pricePerKg,
    unit: "kg",
    quantity: legacy.quantityGrams,
    imageUrl: legacy.imageUrl,
    cutTypeName: legacy.cutTypeName,
  };
}

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(migrate).filter((item): item is CartItem => item !== null);
  } catch {
    // carrinho corrompido não pode derrubar a loja
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // o carrinho flutuante escuta este evento para atualizar o contador
  window.dispatchEvent(new Event("storage"));
}

export function clearCart(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("storage"));
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + calcSubtotal(item.unit, item.price, item.quantity),
    0
  );
}

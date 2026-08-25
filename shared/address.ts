/**
 * Endereço de entrega.
 *
 * O checkout coleta rua, número e bairro separados: num campo único o cliente
 * esquece o número com frequência, e o entregador descobre isso na rua.
 */

export type AddressParts = {
  deliveryStreet: string;
  deliveryNumber: string;
  deliveryNeighborhood: string;
};

/** "Rua das Flores, 123 - Centro" */
export function formatAddress({
  deliveryStreet,
  deliveryNumber,
  deliveryNeighborhood,
}: AddressParts): string {
  return `${deliveryStreet.trim()}, ${deliveryNumber.trim()} - ${deliveryNeighborhood.trim()}`;
}

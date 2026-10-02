/**
 * Aritmética monetária em cêntimos (inteiros) para evitar erros de vírgula flutuante.
 * O arredondamento espelha o ROUND(quantity * unit_price, 2) da coluna gerada
 * `order_items.subtotal` (meio arredonda para cima).
 */
export const toCents = (value: number | string): number => Math.round(Number(value) * 100);
export const fromCents = (cents: number): number => cents / 100;

export function lineTotalCents(quantity: number | string, unitPrice: number | string): number {
  return Math.round((toCents(quantity) * toCents(unitPrice)) / 100);
}

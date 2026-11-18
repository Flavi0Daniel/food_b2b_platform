import { ProductUnit } from './product.model';

const UNIT_LABELS: Record<ProductUnit, { singular: string; plural: string }> = {
  KG: { singular: 'kg', plural: 'kg' },
  CAIXA: { singular: 'caixa', plural: 'caixas' },
  BALDE: { singular: 'balde', plural: 'baldes' },
  SACO: { singular: 'saco', plural: 'sacos' },
  UNIDADE: { singular: 'unidade', plural: 'unidades' },
};

/**
 * Unidade em linguagem normal: 'KG' → 'kg', 'CAIXA' → 'caixa' / 'caixas'.
 * Com `quantity`, concorda no plural ("2 caixas", "1 caixa"); sem ela, devolve o singular ("/ caixa").
 * Uma unidade que o sistema ainda não conhece aparece em minúsculas em vez de em maiúsculas técnicas.
 */
export function unitLabel(unit: string | null | undefined, quantity?: number | null): string {
  if (!unit) return '';
  const entry = UNIT_LABELS[unit as ProductUnit];
  if (!entry) return unit.toLowerCase();
  return quantity !== undefined && quantity !== null && quantity !== 1 ? entry.plural : entry.singular;
}

const UNIT_NAMES: Record<string, string> = {
  KG: 'kg',
  CAIXA: 'caixa',
  BALDE: 'balde',
  SACO: 'saco',
  UNIDADE: 'unidade',
};

/** Unidade em linguagem normal para textos enviados aos utilizadores ('CAIXA' → 'caixa'). */
export function unitName(unit: string): string {
  return UNIT_NAMES[unit] ?? unit.toLowerCase();
}

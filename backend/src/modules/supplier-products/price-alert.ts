const money = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 });

/** Texto do alerta enviado à equipa quando um fornecedor AUMENTA o seu preço de custo. */
export function buildPriceIncreaseMessage(input: {
  supplierLabel: string;
  productName: string;
  oldCost: number;
  newCost: number;
  pendingOrders: number;
}): string {
  const { supplierLabel, productName, oldCost, newCost, pendingOrders } = input;
  const change = oldCost > 0 ? ` (+${percent.format(((newCost - oldCost) / oldCost) * 100)}%)` : '';
  const base = `${supplierLabel} aumentou o custo de "${productName}" de ${money.format(oldCost)} para ${money.format(newCost)} Kz${change}.`;
  return pendingOrders > 0 ? `${base} Há ${pendingOrders} encomenda(s) a aguardar aprovação com este produto.` : base;
}

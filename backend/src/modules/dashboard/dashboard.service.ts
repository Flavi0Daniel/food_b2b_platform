import { fromCents, toCents } from '../../common/utils/money';
import { dashboardRepository } from './dashboard.repository';
import { DashboardQuery } from './dashboard.schema';

const DEFAULT_RANGE_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const dashboardService = {
  async getOverview(q: DashboardQuery) {
    const to = q.to ?? todayUTC();
    const from = q.from ?? shiftDaysUTC(to, -DEFAULT_RANGE_DAYS);
    const period = { fromStart: `${from} 00:00:00`, toEndExclusive: `${shiftDaysUTC(to, 1)} 00:00:00` };

    const [byStatus, revenue, cost, pending, topProducts, carriers, suppliers] = await Promise.all([
      dashboardRepository.ordersByStatus(period),
      dashboardRepository.revenueDelivered(period),
      dashboardRepository.costDelivered(period),
      dashboardRepository.pendingCounts(),
      dashboardRepository.topProducts(period, TOP_PRODUCTS_LIMIT),
      dashboardRepository.carrierPerformance(period),
      dashboardRepository.supplierPerformance(period),
    ]);

    // Aritmética em cêntimos para a subtração não herdar erros de vírgula flutuante
    const marginCents = toCents(revenue.revenue) - toCents(cost.cost);
    const marginPercent = revenue.revenue > 0 ? Number(((marginCents / toCents(revenue.revenue)) * 100).toFixed(2)) : 0;

    return {
      period: { from, to },
      orders_by_status: byStatus,
      revenue: { total: revenue.revenue, delivered_orders: revenue.orders_delivered },
      cost: { total: cost.cost },
      margin: { gross: fromCents(marginCents), percent: marginPercent },
      pending,
      top_products: topProducts,
      carrier_performance: carriers,
      supplier_performance: suppliers,
    };
  },
};

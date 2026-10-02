import { query } from '../../common/utils/db';
import { OrderStatus } from '../../common/types';

export interface OrdersByStatusRow {
  order_status: OrderStatus;
  count: number;
  total_amount: number;
}

export interface RevenueCostRow {
  revenue: number;
  orders_delivered: number;
}

export interface CostRow {
  cost: number;
}

export interface PendingCountsRow {
  pending_payments: number;
  awaiting_approval: number;
  pending_pickup: number;
}

export interface TopProductRow {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CarrierPerformanceRow {
  carrier_id: number;
  carrier_name: string;
  delivered_count: number;
  failed_count: number;
  avg_delivery_minutes: number | null;
}

export interface SupplierPerformanceRow {
  supplier_id: number;
  supplier_name: string;
  purchase_orders_count: number;
  cancelled_count: number;
  total_cost: number;
}

/** Período em formato pronto a comparar com DATETIME: [fromStart, toEndExclusive). */
interface Period {
  fromStart: string;
  toEndExclusive: string;
}

export const dashboardRepository = {
  ordersByStatus: (p: Period) =>
    query<OrdersByStatusRow>(
      `SELECT order_status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_amount
       FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY order_status`,
      [p.fromStart, p.toEndExclusive],
    ),

  async revenueDelivered(p: Period): Promise<RevenueCostRow> {
    const rows = await query<RevenueCostRow>(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders_delivered
       FROM orders WHERE order_status = 'DELIVERED' AND created_at >= ? AND created_at < ?`,
      [p.fromStart, p.toEndExclusive],
    );
    return rows[0] ?? { revenue: 0, orders_delivered: 0 };
  },

  async costDelivered(p: Period): Promise<CostRow> {
    const rows = await query<CostRow>(
      `SELECT COALESCE(SUM(poi.cost_price * poi.quantity), 0) AS cost
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       JOIN orders o ON o.id = po.order_id
       WHERE o.order_status = 'DELIVERED' AND po.status <> 'CANCELLED'
         AND o.created_at >= ? AND o.created_at < ?`,
      [p.fromStart, p.toEndExclusive],
    );
    return rows[0] ?? { cost: 0 };
  },

  async pendingCounts(): Promise<PendingCountsRow> {
    const rows = await query<PendingCountsRow>(
      `SELECT
         (SELECT COUNT(*) FROM payments WHERE status = 'PENDING') AS pending_payments,
         (SELECT COUNT(*) FROM orders WHERE order_status = 'AWAITING_APPROVAL') AS awaiting_approval,
         (SELECT COUNT(*) FROM shipments WHERE shipment_status IN ('PENDING_ASSIGNMENT', 'TO_PICKUP')) AS pending_pickup`,
    );
    return rows[0] ?? { pending_payments: 0, awaiting_approval: 0, pending_pickup: 0 };
  },

  topProducts: (p: Period, limit: number) =>
    query<TopProductRow>(
      `SELECT p.id AS product_id, p.name AS product_name, SUM(oi.quantity) AS quantity_sold,
              SUM(oi.subtotal) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.order_status = 'DELIVERED' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY p.id, p.name ORDER BY quantity_sold DESC LIMIT ?`,
      [p.fromStart, p.toEndExclusive, limit],
    ),

  carrierPerformance: (p: Period) =>
    query<CarrierPerformanceRow>(
      `SELECT u.id AS carrier_id, u.name AS carrier_name,
              SUM(s.shipment_status = 'DELIVERED') AS delivered_count,
              SUM(s.shipment_status = 'FAILED') AS failed_count,
              AVG(CASE WHEN s.shipment_status = 'DELIVERED'
                       THEN TIMESTAMPDIFF(MINUTE, s.picked_up_at, s.delivered_at) END) AS avg_delivery_minutes
       FROM shipments s JOIN users u ON u.id = s.carrier_id
       WHERE s.created_at >= ? AND s.created_at < ?
       GROUP BY u.id, u.name ORDER BY delivered_count DESC`,
      [p.fromStart, p.toEndExclusive],
    ),

  supplierPerformance: (p: Period) =>
    query<SupplierPerformanceRow>(
      `SELECT u.id AS supplier_id, u.name AS supplier_name,
              COUNT(DISTINCT po.id) AS purchase_orders_count,
              COUNT(DISTINCT CASE WHEN po.status = 'CANCELLED' THEN po.id END) AS cancelled_count,
              COALESCE(SUM(CASE WHEN po.status <> 'CANCELLED' THEN poi.cost_price * poi.quantity ELSE 0 END), 0)
                AS total_cost
       FROM purchase_orders po
       JOIN users u ON u.id = po.supplier_id
       LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
       WHERE po.created_at >= ? AND po.created_at < ?
       GROUP BY u.id, u.name ORDER BY total_cost DESC`,
      [p.fromStart, p.toEndExclusive],
    ),
};

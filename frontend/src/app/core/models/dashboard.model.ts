export interface OrdersByStatus {
  orderStatus: string;
  count: number;
  totalAmount: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface CarrierPerformance {
  carrierId: number;
  carrierName: string;
  deliveredCount: number;
  failedCount: number;
  avgDeliveryMinutes: number | null;
}

export interface SupplierPerformance {
  supplierId: number;
  supplierName: string;
  purchaseOrdersCount: number;
  cancelledCount: number;
  totalCost: number;
}

export interface DashboardOverview {
  period: { from: string; to: string };
  ordersByStatus: OrdersByStatus[];
  revenue: { total: number; deliveredOrders: number };
  cost: { total: number };
  margin: { gross: number; percent: number };
  pending: { pendingPayments: number; awaitingApproval: number; pendingPickup: number };
  topProducts: TopProduct[];
  carrierPerformance: CarrierPerformance[];
  supplierPerformance: SupplierPerformance[];
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'AWAITING_APPROVAL'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderPaymentStatus = 'PENDING' | 'PROOF_SUBMITTED' | 'VALIDATED' | 'REJECTED';
export type PaymentMethod = 'MULTICAIXA_EXPRESS' | 'TRANSFERENCIA';

export interface OrderListItem {
  id: number;
  orderNumber: string;
  requestedDeliveryDate: string | null;
  deliveryWindow: string | null;
  totalAmount: number;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  /** Só presente para ADMIN/OPERATOR. */
  clientId?: number;
  clientName?: string;
}

export interface OrderItemDetail {
  id: number;
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** Só presente quando quem pede é ADMIN/OPERATOR, e só depois de a encomenda ser aprovada. */
  supplier?: { id: number; name: string; companyName: string | null } | null;
}

export interface OrderPaymentDetail {
  id: number;
  method: PaymentMethod;
  amount: number;
  transactionRef: string | null;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  proofUrl: string | null;
  createdAt: string;
  /** Só presente para ADMIN/OPERATOR. */
  validatedBy?: number | null;
  validatedAt?: string | null;
}

export interface OrderShipmentDetail {
  id: number;
  shipmentStatus: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  podPhotoUrl: string | null;
  podSignatureUrl: string | null;
  /** Só presente para ADMIN/OPERATOR. */
  purchaseOrderId?: number | null;
  poNumber?: string | null;
  carrier?: { id: number; name: string };
}

export interface OrderPurchaseOrderSummary {
  id: number;
  poNumber: string;
  status: string;
  pickupScheduledAt: string | null;
  supplier: { id: number; name: string };
}

export interface OrderHistoryEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  requestedDeliveryDate: string | null;
  deliveryWindow: string | null;
  notes: string | null;
  subtotalAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  deliveryAddress: { street: string; city: string; municipality: string | null; referencePoint: string | null };
  items: OrderItemDetail[];
  payments: OrderPaymentDetail[];
  shipments: OrderShipmentDetail[];
  history: OrderHistoryEntry[];
  /** Campos seguintes só presentes para ADMIN/OPERATOR (ver orders.service.ts no backend). */
  client?: { id: number; name: string; phone: string | null; companyName: string | null };
  purchaseOrders?: OrderPurchaseOrderSummary[];
}

/** Rótulos em português para os estados, usados em toda a UI do cliente. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendente de Pagamento',
  AWAITING_APPROVAL: 'Aguardando Aprovação',
  PROCESSING: 'Em Processamento',
  IN_TRANSIT: 'Em Trânsito',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

export const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  PENDING: 'Pendente',
  PROOF_SUBMITTED: 'Comprovativo Submetido',
  VALIDATED: 'Validado',
  REJECTED: 'Rejeitado',
};

export type BadgeVariant = 'gray' | 'yellow' | 'blue' | 'green' | 'red';

export function orderStatusVariant(status: OrderStatus): BadgeVariant {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'yellow';
    case 'AWAITING_APPROVAL':
    case 'PROCESSING':
    case 'IN_TRANSIT':
      return 'blue';
    case 'DELIVERED':
      return 'green';
    case 'CANCELLED':
      return 'red';
  }
}

export function paymentStatusVariant(status: OrderPaymentStatus): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'gray';
    case 'PROOF_SUBMITTED':
      return 'yellow';
    case 'VALIDATED':
      return 'green';
    case 'REJECTED':
      return 'red';
  }
}

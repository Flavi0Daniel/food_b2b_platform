import { BadgeVariant } from './order.model';

export type PurchaseOrderStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'COLLECTED'
  | 'CANCELLED';

/** Passos que o fornecedor pode dar (um de cada vez). COLLECTED é definido pela transportadora. */
export type SupplierStep = 'RECEIVED' | 'IN_PREPARATION' | 'READY_FOR_PICKUP';

export interface PurchaseOrderItem {
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
}

/** Visão do FORNECEDOR (cega): o backend nunca envia dados do cliente nem da encomenda. */
export interface PurchaseOrder {
  id: number;
  poNumber: string;
  status: PurchaseOrderStatus;
  pickupScheduledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  totalCost: number;
}

export interface PoNextStep {
  status: SupplierStep;
  label: string;
}

export const PO_NEXT_STEP: Partial<Record<PurchaseOrderStatus, PoNextStep>> = {
  PENDING: { status: 'RECEIVED', label: 'Confirmar receção' },
  RECEIVED: { status: 'IN_PREPARATION', label: 'Iniciar preparação' },
  IN_PREPARATION: { status: 'READY_FOR_PICKUP', label: 'Marcar como pronta para recolha' },
};

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  PENDING: 'Nova',
  RECEIVED: 'Recebida',
  IN_PREPARATION: 'Em Preparação',
  READY_FOR_PICKUP: 'Pronta para Recolha',
  COLLECTED: 'Recolhida',
  CANCELLED: 'Cancelada',
};

export function poStatusLabel(status: string): string {
  return PO_STATUS_LABELS[status as PurchaseOrderStatus] ?? status;
}

export function poStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'RECEIVED':
    case 'IN_PREPARATION':
      return 'blue';
    case 'READY_FOR_PICKUP':
      return 'green';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
}

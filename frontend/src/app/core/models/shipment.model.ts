import { BadgeVariant } from './order.model';

export type ShipmentStatus =
  | 'PENDING_ASSIGNMENT'
  | 'TO_PICKUP'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

/** Transições que a transportadora pode pedir. DELIVERED só via "concluir entrega" (exige prova). */
export type CarrierAction = 'COLLECTED' | 'IN_TRANSIT' | 'FAILED';

export interface ShipmentPoint {
  street: string;
  city: string;
  municipality: string | null;
  referencePoint: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ShipmentItem {
  productName: string;
  quantity: number;
  unit: string;
}

/** Visão da TRANSPORTADORA (cega): só moradas e carga, nunca nomes de fornecedor/cliente nem preços. */
export interface Shipment {
  id: number;
  shipmentStatus: ShipmentStatus;
  scheduledPickupAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  poNumber: string | null;
  readyForPickup: boolean;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  pickup: ShipmentPoint;
  dropoff: ShipmentPoint;
  items: ShipmentItem[];
  podPhotoUrl: string | null;
  podSignatureUrl: string | null;
}

export interface CarrierActionDef {
  status: CarrierAction;
  label: string;
  danger: boolean;
}

export const SHIPMENT_ACTIONS: Partial<Record<ShipmentStatus, CarrierActionDef[]>> = {
  TO_PICKUP: [
    { status: 'COLLECTED', label: 'Carga recolhida', danger: false },
    { status: 'FAILED', label: 'Recolha falhou', danger: true },
  ],
  COLLECTED: [
    { status: 'IN_TRANSIT', label: 'Iniciar trajeto', danger: false },
    { status: 'FAILED', label: 'Entrega falhou', danger: true },
  ],
  IN_TRANSIT: [{ status: 'FAILED', label: 'Entrega falhou', danger: true }],
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING_ASSIGNMENT: 'Por atribuir',
  TO_PICKUP: 'A caminho da recolha',
  COLLECTED: 'Carga recolhida',
  IN_TRANSIT: 'Em trânsito',
  DELIVERED: 'Entregue',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
};

export function shipmentStatusLabel(status: string): string {
  return SHIPMENT_STATUS_LABELS[status as ShipmentStatus] ?? status;
}

export function shipmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'TO_PICKUP':
      return 'yellow';
    case 'COLLECTED':
    case 'IN_TRANSIT':
      return 'blue';
    case 'DELIVERED':
      return 'green';
    case 'FAILED':
      return 'red';
    default:
      return 'gray';
  }
}

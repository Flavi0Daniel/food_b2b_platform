import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { fileUrl } from '../../common/utils/files';
import { buildMeta, offsetOf, PageMeta } from '../../common/utils/pagination';
import { withTransaction } from '../../config/database';
import { notificationsRepository } from '../notifications/notifications.repository';
import { ordersRepository } from '../orders/orders.repository';
import { purchaseOrdersRepository } from '../purchase-orders/purchase-orders.repository';
import {
  ShipmentItemRow,
  ShipmentListRow,
  ShipmentStatus,
  shipmentsRepository,
} from './shipments.repository';
import { ListShipmentsQuery, ReassignCarrierDto, UpdateShipmentStatusDto } from './shipments.schema';

/** Transições que a transportadora pode fazer. DELIVERED só via `deliver` (exige POD). */
const CARRIER_TRANSITIONS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  TO_PICKUP: ['COLLECTED', 'FAILED'],
  COLLECTED: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['FAILED'],
};

/**
 * INTERMEDIAÇÃO CEGA: a transportadora vê o ponto A e o ponto B (moradas) e a carga,
 * mas nunca nomes/etiquetas do fornecedor ou do cliente, nem preços.
 */
function toCarrierView(s: ShipmentListRow, items: ShipmentItemRow[]) {
  return {
    id: s.id,
    shipment_status: s.shipment_status,
    scheduled_pickup_at: s.scheduled_pickup_at,
    picked_up_at: s.picked_up_at,
    delivered_at: s.delivered_at,
    po_number: s.po_number,
    ready_for_pickup: s.po_status === 'READY_FOR_PICKUP' || s.po_status === 'COLLECTED',
    delivery_date: s.requested_delivery_date,
    delivery_window: s.delivery_window,
    pickup: {
      street: s.pickup_street,
      city: s.pickup_city,
      municipality: s.pickup_municipality,
      reference_point: s.pickup_reference_point,
      latitude: s.pickup_latitude,
      longitude: s.pickup_longitude,
    },
    dropoff: {
      street: s.delivery_street,
      city: s.delivery_city,
      municipality: s.delivery_municipality,
      reference_point: s.delivery_reference_point,
      latitude: s.delivery_latitude,
      longitude: s.delivery_longitude,
    },
    items: items.map((i) => ({ product_name: i.product_name, quantity: i.quantity, unit: i.unit })),
    pod_photo_url: fileUrl(s.pod_photo_url),
    pod_signature_url: fileUrl(s.pod_signature_url),
  };
}

function toStaffView(s: ShipmentListRow, items: ShipmentItemRow[]) {
  return {
    ...toCarrierView(s, items),
    order_id: s.order_id,
    order_number: s.order_number,
    client_name: s.client_name,
    supplier_name: s.supplier_name,
    po_status: s.po_status,
    carrier: { id: s.carrier_id, name: s.carrier_name },
    pickup_label: s.pickup_label,
    delivery_label: s.delivery_label,
  };
}

export const shipmentsService = {
  async list(actor: JwtUserPayload, q: ListShipmentsQuery): Promise<{ items: unknown[]; meta: PageMeta }> {
    const staff = isStaff(actor.role);
    const { rows, total } = await shipmentsRepository.list(
      {
        status: q.status,
        carrierId: staff ? q.carrierId : actor.id,
        orderId: staff ? q.orderId : undefined,
      },
      q.pageSize,
      offsetOf(q.page, q.pageSize),
    );
    const items = await shipmentsRepository.getItems(rows.map((r) => r.purchase_order_id).filter((v): v is number => v !== null));
    const view = staff ? toStaffView : toCarrierView;
    return {
      items: rows.map((s) =>
        view(
          s,
          items.filter((i) => i.purchase_order_id === s.purchase_order_id),
        ),
      ),
      meta: buildMeta(q.page, q.pageSize, total),
    };
  },

  async get(actor: JwtUserPayload, id: number) {
    const staff = isStaff(actor.role);
    const shipment = await shipmentsRepository.findViewById(id);
    if (!shipment || (!staff && shipment.carrier_id !== actor.id)) throw AppError.notFound('Guia não encontrada');
    const items = shipment.purchase_order_id ? await shipmentsRepository.getItems([shipment.purchase_order_id]) : [];
    return staff ? toStaffView(shipment, items) : toCarrierView(shipment, items);
  },

  async updateStatus(actor: JwtUserPayload, id: number, dto: UpdateShipmentStatusDto) {
    await withTransaction(async (conn) => {
      const preview = await shipmentsRepository.findById(conn, id);
      if (!preview || preview.carrier_id !== actor.id) throw AppError.notFound('Guia não encontrada');

      // Ordem de bloqueio fixa (encomenda -> guia) para evitar deadlocks entre guias da mesma encomenda
      const order = await ordersRepository.findByIdForUpdate(conn, preview.order_id);
      const shipment = await shipmentsRepository.findByIdForUpdate(conn, id);
      if (!order || !shipment || shipment.carrier_id !== actor.id) throw AppError.notFound('Guia não encontrada');

      if (!CARRIER_TRANSITIONS[shipment.shipment_status]?.includes(dto.status)) {
        throw AppError.conflict(`Transição inválida: ${shipment.shipment_status} → ${dto.status}`);
      }

      if (dto.status === 'COLLECTED') {
        if (shipment.purchase_order_id) {
          const po = await purchaseOrdersRepository.findByIdForUpdate(conn, shipment.purchase_order_id);
          if (!po || po.status !== 'READY_FOR_PICKUP') {
            throw AppError.conflict('A mercadoria ainda não está pronta para recolha');
          }
          await purchaseOrdersRepository.updateStatus(conn, po.id, 'COLLECTED');
        }
        await shipmentsRepository.markCollected(conn, id);
      } else {
        await shipmentsRepository.setStatus(conn, id, dto.status);
      }

      // A 1.ª recolha/trânsito faz avançar a encomenda para "Em Trânsito"
      if ((dto.status === 'COLLECTED' || dto.status === 'IN_TRANSIT') && order.order_status === 'PROCESSING') {
        await ordersRepository.updateStatuses(conn, order.id, { orderStatus: 'IN_TRANSIT' });
        await ordersRepository.insertHistory(conn, order.id, 'IN_TRANSIT', actor.id, 'Mercadoria recolhida, a caminho');
        await notificationsRepository.create(conn, order.client_id, {
          title: 'Encomenda a caminho',
          message: `A sua encomenda ${order.order_number} foi recolhida e está a caminho.`,
          type: 'ORDER_IN_TRANSIT',
          orderId: order.id,
        });
      }

      if (dto.status === 'FAILED') {
        await notificationsRepository.notifyStaff(conn, {
          title: 'Problema na entrega',
          message: `A guia #${id} da encomenda ${order.order_number} foi marcada como falhada.`,
          type: 'SHIPMENT_FAILED',
          orderId: order.id,
        });
      }
    });

    return this.get(actor, id);
  },

  /** Conclui a entrega com prova (foto e/ou assinatura). Se todas as guias da encomenda estiverem entregues, fecha a encomenda. */
  async deliver(
    actor: JwtUserPayload,
    id: number,
    files: { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] },
  ) {
    const photo = files.photo?.[0];
    const signature = files.signature?.[0];
    if (!photo && !signature) {
      throw AppError.badRequest('Envie a foto da carga entregue (photo) e/ou a assinatura (signature)');
    }

    await withTransaction(async (conn) => {
      const preview = await shipmentsRepository.findById(conn, id);
      if (!preview || preview.carrier_id !== actor.id) throw AppError.notFound('Guia não encontrada');

      const order = await ordersRepository.findByIdForUpdate(conn, preview.order_id);
      const shipment = await shipmentsRepository.findByIdForUpdate(conn, id);
      if (!order || !shipment || shipment.carrier_id !== actor.id) throw AppError.notFound('Guia não encontrada');

      if (shipment.shipment_status !== 'COLLECTED' && shipment.shipment_status !== 'IN_TRANSIT') {
        throw AppError.conflict('Só é possível concluir a entrega de uma carga já recolhida');
      }

      await shipmentsRepository.markDelivered(
        conn,
        id,
        photo ? `pod/${photo.filename}` : null,
        signature ? `pod/${signature.filename}` : null,
      );

      const counts = await shipmentsRepository.countByOrder(conn, order.id);
      const allDelivered = counts.total > 0 && counts.delivered === counts.total;

      if (allDelivered) {
        await ordersRepository.updateStatuses(conn, order.id, { orderStatus: 'DELIVERED' });
        await ordersRepository.insertHistory(conn, order.id, 'DELIVERED', actor.id, 'Entrega concluída com prova (POD)');
        await notificationsRepository.create(conn, order.client_id, {
          title: 'Encomenda entregue',
          message: `A sua encomenda ${order.order_number} foi entregue.`,
          type: 'ORDER_DELIVERED',
          orderId: order.id,
        });
      }

      await notificationsRepository.notifyStaff(conn, {
        title: allDelivered ? 'Encomenda entregue' : 'Guia entregue',
        message: allDelivered
          ? `Todas as guias da encomenda ${order.order_number} foram entregues.`
          : `A guia #${id} da encomenda ${order.order_number} foi entregue (${counts.delivered}/${counts.total}).`,
        type: 'SHIPMENT_DELIVERED',
        orderId: order.id,
      });
    });

    return this.get(actor, id);
  },

  /** Staff troca a transportadora enquanto a mercadoria ainda não foi recolhida. */
  async reassign(actor: JwtUserPayload, id: number, dto: ReassignCarrierDto) {
    await withTransaction(async (conn) => {
      const preview = await shipmentsRepository.findById(conn, id);
      if (!preview) throw AppError.notFound('Guia não encontrada');

      const order = await ordersRepository.findByIdForUpdate(conn, preview.order_id);
      const shipment = await shipmentsRepository.findByIdForUpdate(conn, id);
      if (!order || !shipment) throw AppError.notFound('Guia não encontrada');

      const reassignable =
        shipment.picked_up_at === null &&
        (shipment.shipment_status === 'TO_PICKUP' || shipment.shipment_status === 'FAILED');
      if (!reassignable) throw AppError.conflict('Esta guia já não pode mudar de transportadora');

      const carrier = await ordersRepository.findActiveUser(conn, dto.carrierId, 'CARRIER');
      if (!carrier) throw AppError.badRequest('Transportadora inválida ou inativa');

      await shipmentsRepository.reassign(conn, id, dto.carrierId);
      await notificationsRepository.create(conn, dto.carrierId, {
        title: 'Nova guia de transporte',
        message: `Foi-lhe atribuída a guia #${id}.`,
        type: 'SHIPMENT_ASSIGNED',
      });
      if (shipment.carrier_id !== dto.carrierId) {
        await notificationsRepository.create(conn, shipment.carrier_id, {
          title: 'Guia reatribuída',
          message: `A guia #${id} foi atribuída a outra transportadora.`,
          type: 'SHIPMENT_UNASSIGNED',
        });
      }
    });

    return this.get(actor, id);
  },
};

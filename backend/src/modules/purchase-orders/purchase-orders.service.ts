import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { buildMeta, offsetOf, PageMeta } from '../../common/utils/pagination';
import { fromCents, lineTotalCents } from '../../common/utils/money';
import { formatDocumentNumber } from '../../common/utils/documentNumber';
import { withTransaction } from '../../config/database';
import { notificationsRepository } from '../notifications/notifications.repository';
import { ordersRepository } from '../orders/orders.repository';
import { shipmentsRepository } from '../shipments/shipments.repository';
import {
  PoStatus,
  PurchaseOrderItemRow,
  PurchaseOrderListRow,
  purchaseOrdersRepository,
} from './purchase-orders.repository';
import { CancelPoDto, ListPurchaseOrdersQuery, ReassignPoDto, UpdatePoStatusDto } from './purchase-orders.schema';

/** O fornecedor só pode avançar um passo de cada vez. COLLECTED é definido pela transportadora. */
const SUPPLIER_NEXT_STATUS: Partial<Record<PoStatus, PoStatus>> = {
  PENDING: 'RECEIVED',
  RECEIVED: 'IN_PREPARATION',
  IN_PREPARATION: 'READY_FOR_PICKUP',
};

/**
 * INTERMEDIAÇÃO CEGA: o fornecedor recebe apenas o que precisa para preparar a mercadoria.
 * Nunca inclui order_id, order_number, cliente, moradas de entrega nem transportadora.
 */
function toSupplierView(po: PurchaseOrderListRow, items: PurchaseOrderItemRow[]) {
  const totalCents = items.reduce((sum, i) => sum + lineTotalCents(i.quantity, i.cost_price), 0);
  return {
    id: po.id,
    po_number: po.po_number,
    status: po.status,
    pickup_scheduled_at: po.pickup_scheduled_at,
    notes: po.notes,
    created_at: po.created_at,
    updated_at: po.updated_at,
    items: items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit: i.unit,
      cost_price: i.cost_price,
    })),
    total_cost: fromCents(totalCents),
  };
}

function toStaffView(po: PurchaseOrderListRow, items: PurchaseOrderItemRow[]) {
  return {
    ...toSupplierView(po, items),
    order_id: po.order_id,
    order_number: po.order_number,
    supplier: { id: po.supplier_id, name: po.supplier_name, company_name: po.supplier_company },
    shipment: po.shipment_id ? { id: po.shipment_id, status: po.shipment_status } : null,
  };
}

export const purchaseOrdersService = {
  async list(
    actor: JwtUserPayload,
    q: ListPurchaseOrdersQuery,
  ): Promise<{ items: unknown[]; meta: PageMeta }> {
    const staff = isStaff(actor.role);
    const { rows, total } = await purchaseOrdersRepository.list(
      { status: q.status, supplierId: staff ? q.supplierId : actor.id },
      q.pageSize,
      offsetOf(q.page, q.pageSize),
    );
    const items = await purchaseOrdersRepository.getItems(rows.map((r) => r.id));
    const view = staff ? toStaffView : toSupplierView;
    return {
      items: rows.map((po) =>
        view(
          po,
          items.filter((i) => i.purchase_order_id === po.id),
        ),
      ),
      meta: buildMeta(q.page, q.pageSize, total),
    };
  },

  async get(actor: JwtUserPayload, id: number) {
    const staff = isStaff(actor.role);
    const po = await purchaseOrdersRepository.findByIdWithContext(id);
    // 404 (e não 403) para não revelar a existência de ordens de outros fornecedores
    if (!po || (!staff && po.supplier_id !== actor.id)) throw AppError.notFound('Ordem de compra não encontrada');
    const items = await purchaseOrdersRepository.getItems([id]);
    return staff ? toStaffView(po, items) : toSupplierView(po, items);
  },

  async updateStatus(actor: JwtUserPayload, id: number, dto: UpdatePoStatusDto) {
    await withTransaction(async (conn) => {
      const po = await purchaseOrdersRepository.findByIdForUpdate(conn, id);
      if (!po || po.supplier_id !== actor.id) throw AppError.notFound('Ordem de compra não encontrada');

      if (SUPPLIER_NEXT_STATUS[po.status] !== dto.status) {
        throw AppError.conflict(`Transição inválida: ${po.status} → ${dto.status}`);
      }

      await purchaseOrdersRepository.updateStatus(conn, id, dto.status);

      if (dto.status === 'READY_FOR_PICKUP') {
        await notificationsRepository.notifyStaff(conn, {
          title: 'Mercadoria pronta para recolha',
          message: `A ordem de compra ${po.po_number} está pronta para recolha.`,
          type: 'PO_READY',
          orderId: po.order_id,
        });
        const shipment = await purchaseOrdersRepository.findShipmentCarrier(conn, id);
        if (shipment) {
          await notificationsRepository.create(conn, shipment.carrier_id, {
            title: 'Carga pronta para recolha',
            message: `A guia #${shipment.shipment_id} já pode ser recolhida.`,
            type: 'SHIPMENT_READY',
          });
        }
      }
    });

    return this.get(actor, id);
  },

  /** ADMIN/OPERATOR cancela uma ordem de compra ainda não recolhida (ex: fornecedor sem stock). */
  async cancel(actor: JwtUserPayload, id: number, dto: CancelPoDto) {
    await withTransaction(async (conn) => {
      const po = await purchaseOrdersRepository.findByIdForUpdate(conn, id);
      if (!po) throw AppError.notFound('Ordem de compra não encontrada');
      if (po.status === 'COLLECTED' || po.status === 'CANCELLED') {
        throw AppError.conflict('Esta ordem de compra já foi recolhida ou já está cancelada');
      }

      await purchaseOrdersRepository.updateStatus(conn, id, 'CANCELLED');
      await purchaseOrdersRepository.appendNote(conn, id, `Cancelada por ${actor.role}: ${dto.reason}`);

      const shipment = await shipmentsRepository.findByPurchaseOrderForUpdate(conn, id);
      if (shipment && shipment.shipment_status !== 'DELIVERED' && shipment.shipment_status !== 'COLLECTED') {
        await shipmentsRepository.cancel(conn, shipment.id);
        await notificationsRepository.create(conn, shipment.carrier_id, {
          title: 'Guia cancelada',
          message: `A guia #${shipment.id} (${po.po_number}) foi cancelada.`,
          type: 'SHIPMENT_CANCELLED',
        });
      }

      await notificationsRepository.create(conn, po.supplier_id, {
        title: 'Ordem de compra cancelada',
        message: `A ordem ${po.po_number} foi cancelada: ${dto.reason}`,
        type: 'PO_CANCELLED',
      });
    });

    return this.get(actor, id);
  },

  /**
   * ADMIN/OPERATOR reatribui a mercadoria a outro fornecedor: cancela a ordem de compra atual
   * e cria uma nova (com o preço de custo do novo fornecedor), mantendo (ou trocando) a transportadora.
   * Tudo numa única transação.
   */
  async reassign(actor: JwtUserPayload, id: number, dto: ReassignPoDto) {
    const newPoId = await withTransaction(async (conn) => {
      const oldPo = await purchaseOrdersRepository.findByIdForUpdate(conn, id);
      if (!oldPo) throw AppError.notFound('Ordem de compra não encontrada');
      if (oldPo.status === 'COLLECTED' || oldPo.status === 'CANCELLED') {
        throw AppError.conflict('Esta ordem de compra já foi recolhida ou já está cancelada');
      }
      if (dto.supplierId === oldPo.supplier_id) {
        throw AppError.badRequest('Escolha um fornecedor diferente do atual');
      }

      // Lock da encomenda: mantém a ordem fixa (encomenda -> PO -> guia) e impede alterações concorrentes
      const order = await ordersRepository.findByIdForUpdate(conn, oldPo.order_id);
      if (!order) throw AppError.notFound('Encomenda não encontrada');

      const newSupplier = await ordersRepository.findActiveUser(conn, dto.supplierId, 'SUPPLIER');
      if (!newSupplier) throw AppError.badRequest('Fornecedor inválido ou inativo');

      const pickupAddress = await ordersRepository.findPickupAddress(conn, dto.supplierId);
      if (!pickupAddress) {
        throw AppError.badRequest(`O fornecedor "${newSupplier.name}" não tem morada de recolha registada`);
      }

      const items = await purchaseOrdersRepository.getRawItems(conn, id);
      const poLines: { orderItemId: number; quantity: number; unit: (typeof items)[number]['unit']; costPrice: number }[] =
        [];
      for (const item of items) {
        const offer = await ordersRepository.findSupplierProduct(conn, dto.supplierId, item.product_id);
        if (!offer || !offer.is_active) {
          throw AppError.badRequest(
            `O fornecedor "${newSupplier.name}" não tem "${item.product_name}" ativo na sua tabela de preços`,
          );
        }
        poLines.push({ orderItemId: item.order_item_id, quantity: item.quantity, unit: item.unit, costPrice: offer.cost_price });
      }

      const oldShipment = await shipmentsRepository.findByPurchaseOrderForUpdate(conn, id);
      const carrierId = dto.carrierId ?? oldShipment?.carrier_id;
      if (!carrierId) throw AppError.badRequest('Indique a transportadora (não há uma guia anterior para reaproveitar)');
      const carrier = await ordersRepository.findActiveUser(conn, carrierId, 'CARRIER');
      if (!carrier) throw AppError.badRequest('Transportadora inválida ou inativa');

      // --- cancela a ordem (e guia) antigas ---
      await purchaseOrdersRepository.updateStatus(conn, id, 'CANCELLED');
      await purchaseOrdersRepository.appendNote(
        conn,
        id,
        `Reatribuída a ${newSupplier.name} por ${actor.role}: ${dto.reason}`,
      );
      if (oldShipment && oldShipment.shipment_status !== 'DELIVERED' && oldShipment.shipment_status !== 'COLLECTED') {
        await shipmentsRepository.cancel(conn, oldShipment.id);
      }
      await notificationsRepository.create(conn, oldPo.supplier_id, {
        title: 'Ordem de compra cancelada',
        message: `A ordem ${oldPo.po_number} foi reatribuída a outro fornecedor: ${dto.reason}`,
        type: 'PO_CANCELLED',
      });

      // --- cria a nova ordem de compra + guia ---
      const newPoId = await purchaseOrdersRepository.insert(conn, {
        orderId: oldPo.order_id,
        supplierId: dto.supplierId,
        pickupScheduledAt: null,
        notes: `Substitui a ordem ${oldPo.po_number}`,
      });
      const newPoNumber = formatDocumentNumber('PO', newPoId);
      await purchaseOrdersRepository.setNumber(conn, newPoId, newPoNumber);
      await purchaseOrdersRepository.insertItems(conn, newPoId, poLines);
      for (const item of items) await ordersRepository.setItemSupplier(conn, item.order_item_id, dto.supplierId);

      await shipmentsRepository.insert(conn, {
        orderId: oldPo.order_id,
        purchaseOrderId: newPoId,
        carrierId,
        pickupAddressId: pickupAddress.id,
        deliveryAddressId: order.delivery_address_id,
        scheduledPickupAt: null,
      });

      await notificationsRepository.create(conn, dto.supplierId, {
        title: 'Nova ordem de compra',
        message: `Ordem ${newPoNumber}: prepare a mercadoria para recolha.`,
        type: 'PO_ASSIGNED',
      });
      await notificationsRepository.create(conn, carrierId, {
        title: 'Guia de transporte atualizada',
        message: `A guia da ordem ${oldPo.po_number} foi substituída pela ordem ${newPoNumber}.`,
        type: 'SHIPMENT_ASSIGNED',
      });

      return newPoId;
    });

    return this.get(actor, newPoId);
  },
};

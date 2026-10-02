import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { formatDocumentNumber } from '../../common/utils/documentNumber';
import { fileUrl } from '../../common/utils/files';
import { fromCents, lineTotalCents } from '../../common/utils/money';
import { buildMeta, offsetOf, PageMeta } from '../../common/utils/pagination';
import { pool, withTransaction } from '../../config/database';
import { notificationsRepository } from '../notifications/notifications.repository';
import { purchaseOrdersRepository } from '../purchase-orders/purchase-orders.repository';
import { shipmentsRepository } from '../shipments/shipments.repository';
import { OrderItemRaw, ordersRepository } from './orders.repository';
import { ApproveOrderDto, CancelOrderDto, CreateOrderDto, ListOrdersQuery } from './orders.schema';

export const ordersService = {
  // =====================================================================
  // CLIENTE cria a encomenda: preços e totais são SEMPRE calculados no servidor
  // =====================================================================
  async create(actor: JwtUserPayload, dto: CreateOrderDto) {
    const orderId = await withTransaction(async (conn) => {
      const address = await ordersRepository.findAddressOwnedBy(conn, dto.deliveryAddressId, actor.id);
      if (!address) throw AppError.badRequest('Morada de entrega inválida');

      const products = await ordersRepository.findProducts(
        conn,
        dto.items.map((i) => i.productId),
      );
      const productById = new Map(products.map((p) => [p.id, p]));

      let totalCents = 0;
      const lines = dto.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw AppError.badRequest(`Produto ${item.productId} não existe`);
        if (!product.is_available || product.sell_price === null) {
          throw AppError.conflict(`O produto "${product.name}" não está disponível de momento`);
        }
        totalCents += lineTotalCents(item.quantity, product.sell_price);
        return {
          productId: product.id,
          unit: product.base_unit, // vende-se na unidade base do produto (Kg, Caixa, Balde, Saco)
          quantity: item.quantity,
          unitPrice: product.sell_price, // preço de venda "congelado" no momento da encomenda
        };
      });

      const id = await ordersRepository.insert(conn, {
        clientId: actor.id,
        addressId: dto.deliveryAddressId,
        requestedDeliveryDate: dto.requestedDeliveryDate,
        deliveryWindow: dto.deliveryWindow ?? null,
        notes: dto.notes ?? null,
        totalAmount: fromCents(totalCents),
      });
      const orderNumber = formatDocumentNumber('ORD', id);
      await ordersRepository.setNumber(conn, id, orderNumber);
      await ordersRepository.insertItems(conn, id, lines);
      await ordersRepository.insertHistory(conn, id, 'PENDING_PAYMENT', actor.id, 'Encomenda criada');
      await notificationsRepository.notifyStaff(conn, {
        title: 'Nova encomenda',
        message: `Nova encomenda ${orderNumber} à espera de pagamento.`,
        type: 'NEW_ORDER',
        orderId: id,
      });
      return id;
    });

    return this.getDetail(actor, orderId);
  },

  // =====================================================================
  // Listagem: CLIENTE vê só as suas; STAFF vê todas (com filtros)
  // =====================================================================
  async list(actor: JwtUserPayload, q: ListOrdersQuery): Promise<{ items: unknown[]; meta: PageMeta }> {
    const staff = isStaff(actor.role);
    const { rows, total } = await ordersRepository.list(
      {
        orderStatus: q.orderStatus,
        paymentStatus: q.paymentStatus,
        search: q.search,
        clientId: staff ? q.clientId : actor.id, // cliente nunca consegue ver encomendas de outros
      },
      q.pageSize,
      offsetOf(q.page, q.pageSize),
    );

    const items = staff
      ? rows
      : rows.map((r) => ({
          id: r.id,
          order_number: r.order_number,
          requested_delivery_date: r.requested_delivery_date,
          delivery_window: r.delivery_window,
          total_amount: r.total_amount,
          payment_status: r.payment_status,
          order_status: r.order_status,
          created_at: r.created_at,
        }));
    return { items, meta: buildMeta(q.page, q.pageSize, total) };
  },

  // =====================================================================
  // Detalhe: o conteúdo depende do perfil (cliente nunca vê fornecedores/transportadoras)
  // =====================================================================
  async getDetail(actor: JwtUserPayload, id: number) {
    const staff = isStaff(actor.role);
    const header = await ordersRepository.getHeader(pool, id);
    // 404 (e não 403) para não revelar a existência de encomendas de outros clientes
    if (!header || (!staff && header.client_id !== actor.id)) throw AppError.notFound('Encomenda não encontrada');

    const [items, payments, shipments, history, purchaseOrders] = await Promise.all([
      ordersRepository.getItems(pool, id),
      ordersRepository.getPayments(pool, id),
      ordersRepository.getShipments(pool, id),
      ordersRepository.getHistory(pool, id),
      staff ? ordersRepository.getPurchaseOrders(pool, id) : Promise.resolve([]),
    ]);

    return {
      id: header.id,
      order_number: header.order_number,
      order_status: header.order_status,
      payment_status: header.payment_status,
      requested_delivery_date: header.requested_delivery_date,
      delivery_window: header.delivery_window,
      notes: header.notes,
      subtotal_amount: header.subtotal_amount,
      total_amount: header.total_amount,
      created_at: header.created_at,
      updated_at: header.updated_at,
      delivery_address: {
        street: header.address_street,
        city: header.address_city,
        municipality: header.address_municipality,
        reference_point: header.address_reference_point,
      },
      ...(staff
        ? {
            client: {
              id: header.client_id,
              name: header.client_name,
              phone: header.client_phone,
              company_name: header.client_company,
            },
          }
        : {}),
      items: items.map((i) => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.product_name,
        unit: i.unit,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        ...(staff
          ? {
              supplier: i.supplier_id
                ? { id: i.supplier_id, name: i.supplier_name, company_name: i.supplier_company }
                : null,
            }
          : {}),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        method: p.method,
        amount: p.amount,
        transaction_ref: p.transaction_ref,
        status: p.status,
        created_at: p.created_at,
        proof_url: fileUrl(p.proof_url),
        ...(staff ? { validated_by: p.validated_by, validated_at: p.validated_at } : {}),
      })),
      shipments: shipments.map((s) => ({
        id: s.id,
        shipment_status: s.shipment_status,
        picked_up_at: s.picked_up_at,
        delivered_at: s.delivered_at,
        pod_photo_url: fileUrl(s.pod_photo_url),
        pod_signature_url: fileUrl(s.pod_signature_url),
        ...(staff
          ? {
              purchase_order_id: s.purchase_order_id,
              po_number: s.po_number,
              scheduled_pickup_at: s.scheduled_pickup_at,
              carrier: { id: s.carrier_id, name: s.carrier_name },
              pickup_address: { street: s.pickup_street, city: s.pickup_city },
            }
          : {}),
      })),
      ...(staff
        ? {
            purchase_orders: purchaseOrders.map((po) => ({
              id: po.id,
              po_number: po.po_number,
              status: po.status,
              pickup_scheduled_at: po.pickup_scheduled_at,
              supplier: { id: po.supplier_id, name: po.supplier_name },
            })),
          }
        : {}),
      history: history.map((h) => ({
        status: h.status,
        note: h.note,
        created_at: h.created_at,
        ...(staff ? { changed_by: h.changed_by_name } : {}),
      })),
    };
  },

  // =====================================================================
  // Cancelamento (só antes da aprovação)
  // =====================================================================
  async cancel(actor: JwtUserPayload, id: number, dto: CancelOrderDto) {
    const staff = isStaff(actor.role);

    await withTransaction(async (conn) => {
      const order = await ordersRepository.findByIdForUpdate(conn, id);
      if (!order || (!staff && order.client_id !== actor.id)) throw AppError.notFound('Encomenda não encontrada');

      if (order.order_status !== 'PENDING_PAYMENT' && order.order_status !== 'AWAITING_APPROVAL') {
        throw AppError.conflict('A encomenda já está em processamento e não pode ser cancelada por esta via');
      }
      if (!staff && order.payment_status === 'VALIDATED') {
        throw AppError.conflict('O pagamento já foi validado. Contacte o suporte para cancelar esta encomenda.');
      }

      await ordersRepository.updateStatuses(conn, id, { orderStatus: 'CANCELLED' });
      await ordersRepository.insertHistory(
        conn,
        id,
        'CANCELLED',
        actor.id,
        dto.reason ?? (staff ? 'Cancelada pela equipa' : 'Cancelada pelo cliente'),
      );

      if (staff) {
        await notificationsRepository.create(conn, order.client_id, {
          title: 'Encomenda cancelada',
          message: `A encomenda ${order.order_number} foi cancelada.${dto.reason ? ` Motivo: ${dto.reason}` : ''}`,
          type: 'ORDER_CANCELLED',
          orderId: id,
        });
      } else {
        await notificationsRepository.notifyStaff(conn, {
          title: 'Encomenda cancelada pelo cliente',
          message: `O cliente cancelou a encomenda ${order.order_number}.`,
          type: 'ORDER_CANCELLED',
          orderId: id,
        });
      }
    });

    return this.getDetail(actor, id);
  },

  // =====================================================================
  // ADMIN aprova: atribui um fornecedor a cada item e uma transportadora.
  // Gera Ordens de Compra (1 por fornecedor) e Guias de Transporte (1 por ordem de compra).
  // Tudo numa única transação: ou fica tudo criado, ou nada.
  // =====================================================================
  async approve(actor: JwtUserPayload, id: number, dto: ApproveOrderDto) {
    await withTransaction(async (conn) => {
      const order = await ordersRepository.findByIdForUpdate(conn, id); // bloqueia: impede dupla aprovação
      if (!order) throw AppError.notFound('Encomenda não encontrada');
      if (order.order_status !== 'AWAITING_APPROVAL') {
        throw AppError.conflict('A encomenda não está a aguardar aprovação');
      }
      if (order.payment_status !== 'VALIDATED') {
        throw AppError.badRequest('O pagamento desta encomenda ainda não foi validado');
      }

      // --- cada item tem de ter exatamente um fornecedor ---
      const items = await ordersRepository.getItemsRaw(conn, id);
      const supplierByItem = new Map<number, number>();
      for (const a of dto.assignments) {
        if (supplierByItem.has(a.orderItemId)) {
          throw AppError.badRequest(`O item ${a.orderItemId} foi atribuído mais do que uma vez`);
        }
        supplierByItem.set(a.orderItemId, a.supplierId);
      }
      const knownItemIds = new Set(items.map((i) => i.id));
      if (supplierByItem.size !== items.length || [...supplierByItem.keys()].some((k) => !knownItemIds.has(k))) {
        throw AppError.badRequest('Atribua exatamente um fornecedor a cada item da encomenda');
      }

      const carrier = await ordersRepository.findActiveUser(conn, dto.carrierId, 'CARRIER');
      if (!carrier) throw AppError.badRequest('Transportadora inválida ou inativa');

      // --- agrupar itens por fornecedor ---
      const groups = new Map<number, OrderItemRaw[]>();
      for (const item of items) {
        const supplierId = supplierByItem.get(item.id)!;
        groups.set(supplierId, [...(groups.get(supplierId) ?? []), item]);
      }

      const pickupAt = dto.pickupScheduledAt ? new Date(dto.pickupScheduledAt) : null;

      for (const [supplierId, groupItems] of groups) {
        const supplier = await ordersRepository.findActiveUser(conn, supplierId, 'SUPPLIER');
        if (!supplier) throw AppError.badRequest(`Fornecedor ${supplierId} inválido ou inativo`);

        const pickupAddress = await ordersRepository.findPickupAddress(conn, supplierId);
        if (!pickupAddress) {
          throw AppError.badRequest(`O fornecedor "${supplier.name}" não tem morada de recolha registada`);
        }

        // custo acordado com ESTE fornecedor (fica "congelado" na ordem de compra)
        const poLines: { orderItemId: number; quantity: number; unit: OrderItemRaw['unit']; costPrice: number }[] = [];
        for (const item of groupItems) {
          const offer = await ordersRepository.findSupplierProduct(conn, supplierId, item.product_id);
          if (!offer || !offer.is_active) {
            throw AppError.badRequest(
              `O fornecedor "${supplier.name}" não tem "${item.product_name}" ativo na sua tabela de preços`,
            );
          }
          poLines.push({ orderItemId: item.id, quantity: item.quantity, unit: item.unit, costPrice: offer.cost_price });
        }

        const poId = await purchaseOrdersRepository.insert(conn, {
          orderId: id,
          supplierId,
          pickupScheduledAt: pickupAt,
          notes: dto.notes ?? null,
        });
        const poNumber = formatDocumentNumber('PO', poId);
        await purchaseOrdersRepository.setNumber(conn, poId, poNumber);
        await purchaseOrdersRepository.insertItems(conn, poId, poLines);
        for (const item of groupItems) await ordersRepository.setItemSupplier(conn, item.id, supplierId);

        await shipmentsRepository.insert(conn, {
          orderId: id,
          purchaseOrderId: poId,
          carrierId: dto.carrierId,
          pickupAddressId: pickupAddress.id,
          deliveryAddressId: order.delivery_address_id,
          scheduledPickupAt: pickupAt,
        });

        // notificação cega: só o número da ordem de compra, nada do cliente
        await notificationsRepository.create(conn, supplierId, {
          title: 'Nova ordem de compra',
          message: `Ordem ${poNumber}: prepare a mercadoria para recolha.`,
          type: 'PO_ASSIGNED',
        });
      }

      await notificationsRepository.create(conn, dto.carrierId, {
        title: 'Novas guias de transporte',
        message: `Foram-lhe atribuídas ${groups.size} guia(s) de transporte.`,
        type: 'SHIPMENT_ASSIGNED',
      });

      await ordersRepository.updateStatuses(conn, id, { orderStatus: 'PROCESSING' });
      await ordersRepository.insertHistory(conn, id, 'PROCESSING', actor.id, 'Encomenda aprovada');
      await notificationsRepository.create(conn, order.client_id, {
        title: 'Encomenda aprovada',
        message: `A sua encomenda ${order.order_number} foi aprovada e está em processamento.`,
        type: 'ORDER_APPROVED',
        orderId: id,
      });
    });

    return this.getDetail(actor, id);
  },
};

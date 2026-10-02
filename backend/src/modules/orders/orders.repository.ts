import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';
import { temporaryDocumentNumber } from '../../common/utils/documentNumber';
import { OrderPaymentStatus, OrderStatus, ProductUnit, UserRole } from '../../common/types';

export interface OrderRow {
  id: number;
  order_number: string;
  client_id: number;
  delivery_address_id: number;
  requested_delivery_date: string | null;
  delivery_window: string | null;
  subtotal_amount: number;
  total_amount: number;
  payment_status: OrderPaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderListRow {
  id: number;
  order_number: string;
  client_id: number;
  client_name: string;
  requested_delivery_date: string | null;
  delivery_window: string | null;
  total_amount: number;
  payment_status: OrderPaymentStatus;
  order_status: OrderStatus;
  created_at: string;
}

export interface OrderHeaderRow extends OrderRow {
  address_street: string;
  address_city: string;
  address_municipality: string | null;
  address_reference_point: string | null;
  client_name: string;
  client_phone: string | null;
  client_company: string | null;
}

export interface OrderItemDetailRow {
  id: number;
  product_id: number;
  product_name: string;
  unit: ProductUnit;
  quantity: number;
  unit_price: number;
  subtotal: number;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_company: string | null;
}

export interface OrderItemRaw {
  id: number;
  product_id: number;
  product_name: string;
  unit: ProductUnit;
  quantity: number;
}

export interface ProductForOrder {
  id: number;
  name: string;
  base_unit: ProductUnit;
  is_available: boolean;
  sell_price: number | null;
}

export interface OrderPaymentRow {
  id: number;
  method: string;
  amount: number;
  transaction_ref: string | null;
  proof_url: string | null;
  status: string;
  validated_by: number | null;
  validated_at: string | null;
  created_at: string;
}

export interface OrderShipmentRow {
  id: number;
  purchase_order_id: number | null;
  po_number: string | null;
  shipment_status: string;
  scheduled_pickup_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pod_photo_url: string | null;
  pod_signature_url: string | null;
  carrier_id: number;
  carrier_name: string;
  pickup_street: string;
  pickup_city: string;
}

export interface OrderPurchaseOrderRow {
  id: number;
  po_number: string;
  status: string;
  pickup_scheduled_at: string | null;
  supplier_id: number;
  supplier_name: string;
}

export interface OrderHistoryRow {
  status: string;
  note: string | null;
  created_at: string;
  changed_by: number | null;
  changed_by_name: string | null;
}

export const ordersRepository = {
  // ---------- escrita ----------
  async insert(
    db: Db,
    o: {
      clientId: number;
      addressId: number;
      requestedDeliveryDate: string;
      deliveryWindow: string | null;
      notes: string | null;
      totalAmount: number;
    },
  ): Promise<number> {
    const result = await exec(
      `INSERT INTO orders (order_number, client_id, delivery_address_id, requested_delivery_date, delivery_window,
                           subtotal_amount, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        temporaryDocumentNumber(),
        o.clientId,
        o.addressId,
        o.requestedDeliveryDate,
        o.deliveryWindow,
        o.totalAmount,
        o.totalAmount,
        o.notes,
      ],
      db,
    );
    return result.insertId;
  },

  async setNumber(db: Db, id: number, orderNumber: string): Promise<void> {
    await exec('UPDATE orders SET order_number = ? WHERE id = ?', [orderNumber, id], db);
  },

  async insertItems(
    db: Db,
    orderId: number,
    items: { productId: number; unit: ProductUnit; quantity: number; unitPrice: number }[],
  ): Promise<void> {
    await exec(
      'INSERT INTO order_items (order_id, product_id, unit, quantity, unit_price) VALUES ?',
      [items.map((i) => [orderId, i.productId, i.unit, i.quantity, i.unitPrice])],
      db,
    );
  },

  async insertHistory(
    db: Db,
    orderId: number,
    status: string,
    changedBy: number | null,
    note: string | null,
  ): Promise<void> {
    await exec(
      'INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES (?, ?, ?, ?)',
      [orderId, status, changedBy, note],
      db,
    );
  },

  /** Atualiza só os campos indicados (COALESCE mantém o valor atual quando vem null). */
  async updateStatuses(
    db: Db,
    id: number,
    patch: { orderStatus?: OrderStatus; paymentStatus?: OrderPaymentStatus },
  ): Promise<void> {
    await exec(
      `UPDATE orders SET order_status = COALESCE(?, order_status), payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [patch.orderStatus ?? null, patch.paymentStatus ?? null, id],
      db,
    );
  },

  async setItemSupplier(db: Db, itemId: number, supplierId: number): Promise<void> {
    await exec('UPDATE order_items SET supplier_id = ? WHERE id = ?', [supplierId, itemId], db);
  },

  // ---------- leitura de apoio às regras de negócio ----------
  /** Bloqueia a linha da encomenda até ao fim da transação: serializa aprovações/pagamentos concorrentes. */
  findByIdForUpdate: (db: Db, id: number) =>
    queryOne<OrderRow>('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id], db),

  findAddressOwnedBy: (db: Db, addressId: number, userId: number) =>
    queryOne<{ id: number }>('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId], db),

  async findProducts(db: Db, ids: number[]): Promise<ProductForOrder[]> {
    if (!ids.length) return [];
    return query<ProductForOrder>(
      'SELECT id, name, base_unit, is_available, sell_price FROM products WHERE id IN (?)',
      [ids],
      db,
    );
  },

  getItemsRaw: (db: Db, orderId: number) =>
    query<OrderItemRaw>(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.unit, oi.quantity
       FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`,
      [orderId],
      db,
    ),

  findActiveUser: (db: Db, id: number, role: UserRole) =>
    queryOne<{ id: number; name: string }>(
      "SELECT id, name FROM users WHERE id = ? AND role = ? AND status = 'ACTIVE'",
      [id, role],
      db,
    ),

  findPickupAddress: (db: Db, supplierId: number) =>
    queryOne<{ id: number }>(
      'SELECT id FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1',
      [supplierId],
      db,
    ),

  findSupplierProduct: (db: Db, supplierId: number, productId: number) =>
    queryOne<{ cost_price: number; is_active: boolean }>(
      'SELECT cost_price, is_active FROM supplier_products WHERE supplier_id = ? AND product_id = ?',
      [supplierId, productId],
      db,
    ),

  // ---------- listagem e detalhe ----------
  async list(
    filters: { clientId?: number; orderStatus?: string; paymentStatus?: string; search?: string },
    limit: number,
    offset: number,
  ): Promise<{ rows: OrderListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.clientId) {
      conditions.push('o.client_id = ?');
      params.push(filters.clientId);
    }
    if (filters.orderStatus) {
      conditions.push('o.order_status = ?');
      params.push(filters.orderStatus);
    }
    if (filters.paymentStatus) {
      conditions.push('o.payment_status = ?');
      params.push(filters.paymentStatus);
    }
    if (filters.search) {
      conditions.push('o.order_number LIKE ?');
      params.push(`%${filters.search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query<OrderListRow>(
      `SELECT o.id, o.order_number, o.client_id, u.name AS client_name, o.requested_delivery_date,
              o.delivery_window, o.total_amount, o.payment_status, o.order_status, o.created_at
       FROM orders o JOIN users u ON u.id = o.client_id
       ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const count = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    return { rows, total: count?.total ?? 0 };
  },

  getHeader: (db: Db, id: number) =>
    queryOne<OrderHeaderRow>(
      `SELECT o.*, a.street AS address_street, a.city AS address_city, a.municipality AS address_municipality,
              a.reference_point AS address_reference_point, u.name AS client_name, u.phone AS client_phone,
              u.company_name AS client_company
       FROM orders o
       JOIN addresses a ON a.id = o.delivery_address_id
       JOIN users u ON u.id = o.client_id
       WHERE o.id = ?`,
      [id],
      db,
    ),

  getItems: (db: Db, orderId: number) =>
    query<OrderItemDetailRow>(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.unit, oi.quantity, oi.unit_price, oi.subtotal,
              oi.supplier_id, s.name AS supplier_name, s.company_name AS supplier_company
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN users s ON s.id = oi.supplier_id
       WHERE oi.order_id = ? ORDER BY oi.id`,
      [orderId],
      db,
    ),

  getPayments: (db: Db, orderId: number) =>
    query<OrderPaymentRow>(
      `SELECT id, method, amount, transaction_ref, proof_url, status, validated_by, validated_at, created_at
       FROM payments WHERE order_id = ? ORDER BY id DESC`,
      [orderId],
      db,
    ),

  getShipments: (db: Db, orderId: number) =>
    query<OrderShipmentRow>(
      `SELECT s.id, s.purchase_order_id, po.po_number, s.shipment_status, s.scheduled_pickup_at, s.picked_up_at,
              s.delivered_at, s.pod_photo_url, s.pod_signature_url, s.carrier_id, c.name AS carrier_name,
              pa.street AS pickup_street, pa.city AS pickup_city
       FROM shipments s
       LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id
       JOIN users c ON c.id = s.carrier_id
       JOIN addresses pa ON pa.id = s.pickup_address_id
       WHERE s.order_id = ? ORDER BY s.id`,
      [orderId],
      db,
    ),

  getPurchaseOrders: (db: Db, orderId: number) =>
    query<OrderPurchaseOrderRow>(
      `SELECT po.id, po.po_number, po.status, po.pickup_scheduled_at, po.supplier_id, u.name AS supplier_name
       FROM purchase_orders po JOIN users u ON u.id = po.supplier_id
       WHERE po.order_id = ? ORDER BY po.id`,
      [orderId],
      db,
    ),

  getHistory: (db: Db, orderId: number) =>
    query<OrderHistoryRow>(
      `SELECT h.status, h.note, h.created_at, h.changed_by, u.name AS changed_by_name
       FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ? ORDER BY h.id`,
      [orderId],
      db,
    ),
};

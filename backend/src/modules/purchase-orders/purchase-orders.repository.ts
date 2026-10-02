import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';
import { temporaryDocumentNumber } from '../../common/utils/documentNumber';
import { ProductUnit } from '../../common/types';

export type PoStatus = 'PENDING' | 'RECEIVED' | 'IN_PREPARATION' | 'READY_FOR_PICKUP' | 'COLLECTED' | 'CANCELLED';

export interface PurchaseOrderRow {
  id: number;
  po_number: string;
  order_id: number;
  supplier_id: number;
  status: PoStatus;
  pickup_scheduled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListRow extends PurchaseOrderRow {
  order_number: string;
  supplier_name: string;
  supplier_company: string | null;
  shipment_id: number | null;
  shipment_status: string | null;
}

export interface PurchaseOrderItemRow {
  purchase_order_id: number;
  product_name: string;
  quantity: number;
  unit: ProductUnit;
  cost_price: number;
}

const SELECT_LIST = `SELECT po.*, o.order_number, u.name AS supplier_name, u.company_name AS supplier_company,
                            s.id AS shipment_id, s.shipment_status
                     FROM purchase_orders po
                     JOIN orders o ON o.id = po.order_id
                     JOIN users u ON u.id = po.supplier_id
                     LEFT JOIN shipments s ON s.purchase_order_id = po.id`;

function buildWhere(filters: { supplierId?: number; status?: string }) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.supplierId) {
    conditions.push('po.supplier_id = ?');
    params.push(filters.supplierId);
  }
  if (filters.status) {
    conditions.push('po.status = ?');
    params.push(filters.status);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export const purchaseOrdersRepository = {
  async insert(
    db: Db,
    data: { orderId: number; supplierId: number; pickupScheduledAt: Date | null; notes: string | null },
  ): Promise<number> {
    const result = await exec(
      `INSERT INTO purchase_orders (po_number, order_id, supplier_id, status, pickup_scheduled_at, notes)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [temporaryDocumentNumber(), data.orderId, data.supplierId, data.pickupScheduledAt, data.notes],
      db,
    );
    return result.insertId;
  },

  async setNumber(db: Db, id: number, poNumber: string): Promise<void> {
    await exec('UPDATE purchase_orders SET po_number = ? WHERE id = ?', [poNumber, id], db);
  },

  async insertItems(
    db: Db,
    poId: number,
    rows: { orderItemId: number; quantity: number; unit: ProductUnit; costPrice: number }[],
  ): Promise<void> {
    await exec(
      'INSERT INTO purchase_order_items (purchase_order_id, order_item_id, quantity, unit, cost_price) VALUES ?',
      [rows.map((r) => [poId, r.orderItemId, r.quantity, r.unit, r.costPrice])],
      db,
    );
  },

  findByIdForUpdate: (db: Db, id: number) =>
    queryOne<PurchaseOrderRow>('SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE', [id], db),

  async updateStatus(db: Db, id: number, status: PoStatus): Promise<void> {
    await exec('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id], db);
  },

  findByIdWithContext: (id: number) => queryOne<PurchaseOrderListRow>(`${SELECT_LIST} WHERE po.id = ?`, [id]),

  async list(
    filters: { supplierId?: number; status?: string },
    limit: number,
    offset: number,
  ): Promise<{ rows: PurchaseOrderListRow[]; total: number }> {
    const { where, params } = buildWhere(filters);
    const rows = await query<PurchaseOrderListRow>(
      `${SELECT_LIST} ${where} ORDER BY po.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const count = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM purchase_orders po ${where}`,
      params,
    );
    return { rows, total: count?.total ?? 0 };
  },

  async getItems(poIds: number[]): Promise<PurchaseOrderItemRow[]> {
    if (!poIds.length) return [];
    return query<PurchaseOrderItemRow>(
      `SELECT poi.purchase_order_id, p.name AS product_name, poi.quantity, poi.unit, poi.cost_price
       FROM purchase_order_items poi
       JOIN order_items oi ON oi.id = poi.order_item_id
       JOIN products p ON p.id = oi.product_id
       WHERE poi.purchase_order_id IN (?) ORDER BY poi.id`,
      [poIds],
    );
  },

  findShipmentCarrier: (db: Db, poId: number) =>
    queryOne<{ shipment_id: number; carrier_id: number }>(
      'SELECT id AS shipment_id, carrier_id FROM shipments WHERE purchase_order_id = ?',
      [poId],
      db,
    ),

  /** Itens "crus" da ordem de compra (para recriar numa reatribuição a outro fornecedor). */
  getRawItems: (db: Db, poId: number) =>
    query<{ order_item_id: number; product_id: number; product_name: string; quantity: number; unit: ProductUnit }>(
      `SELECT poi.order_item_id, oi.product_id, p.name AS product_name, poi.quantity, poi.unit
       FROM purchase_order_items poi
       JOIN order_items oi ON oi.id = poi.order_item_id
       JOIN products p ON p.id = oi.product_id
       WHERE poi.purchase_order_id = ? ORDER BY poi.id`,
      [poId],
      db,
    ),

  /** Acrescenta uma nota ao histórico interno da ordem de compra (cancelamento/reatribuição). */
  async appendNote(db: Db, id: number, note: string): Promise<void> {
    await exec(
      "UPDATE purchase_orders SET notes = TRIM(CONCAT(COALESCE(notes, ''), '\n[', NOW(), '] ', ?)) WHERE id = ?",
      [note, id],
      db,
    );
  },
};

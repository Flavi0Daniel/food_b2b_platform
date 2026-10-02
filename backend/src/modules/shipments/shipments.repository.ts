import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';

export type ShipmentStatus =
  | 'PENDING_ASSIGNMENT'
  | 'TO_PICKUP'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface ShipmentRow {
  id: number;
  order_id: number;
  purchase_order_id: number | null;
  carrier_id: number;
  pickup_address_id: number;
  delivery_address_id: number;
  shipment_status: ShipmentStatus;
  pod_photo_url: string | null;
  pod_signature_url: string | null;
  scheduled_pickup_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentListRow {
  id: number;
  order_id: number;
  order_number: string;
  client_name: string;
  purchase_order_id: number | null;
  po_number: string | null;
  po_status: string | null;
  supplier_name: string | null;
  carrier_id: number;
  carrier_name: string;
  shipment_status: ShipmentStatus;
  scheduled_pickup_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pod_photo_url: string | null;
  pod_signature_url: string | null;
  requested_delivery_date: string | null;
  delivery_window: string | null;
  pickup_label: string | null;
  pickup_street: string;
  pickup_city: string;
  pickup_municipality: string | null;
  pickup_reference_point: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_label: string | null;
  delivery_street: string;
  delivery_city: string;
  delivery_municipality: string | null;
  delivery_reference_point: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
}

export interface ShipmentItemRow {
  purchase_order_id: number;
  product_name: string;
  quantity: number;
  unit: string;
}

const SELECT_SHIPMENT = `
  SELECT s.id, s.order_id, o.order_number, cl.name AS client_name, s.purchase_order_id, po.po_number,
         po.status AS po_status, sup.name AS supplier_name, s.carrier_id, c.name AS carrier_name,
         s.shipment_status, s.scheduled_pickup_at, s.picked_up_at, s.delivered_at, s.pod_photo_url,
         s.pod_signature_url, o.requested_delivery_date, o.delivery_window,
         pa.label AS pickup_label, pa.street AS pickup_street, pa.city AS pickup_city,
         pa.municipality AS pickup_municipality, pa.reference_point AS pickup_reference_point,
         pa.latitude AS pickup_latitude, pa.longitude AS pickup_longitude,
         da.label AS delivery_label, da.street AS delivery_street, da.city AS delivery_city,
         da.municipality AS delivery_municipality, da.reference_point AS delivery_reference_point,
         da.latitude AS delivery_latitude, da.longitude AS delivery_longitude
  FROM shipments s
  JOIN orders o ON o.id = s.order_id
  JOIN users cl ON cl.id = o.client_id
  JOIN users c ON c.id = s.carrier_id
  JOIN addresses pa ON pa.id = s.pickup_address_id
  JOIN addresses da ON da.id = s.delivery_address_id
  LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id
  LEFT JOIN users sup ON sup.id = po.supplier_id`;

export const shipmentsRepository = {
  async insert(
    db: Db,
    data: {
      orderId: number;
      purchaseOrderId: number;
      carrierId: number;
      pickupAddressId: number;
      deliveryAddressId: number;
      scheduledPickupAt: Date | null;
    },
  ): Promise<number> {
    // Nasce já atribuída a uma transportadora: TO_PICKUP = "a caminho da recolha"
    const result = await exec(
      `INSERT INTO shipments (order_id, purchase_order_id, carrier_id, pickup_address_id, delivery_address_id,
                              shipment_status, scheduled_pickup_at)
       VALUES (?, ?, ?, ?, ?, 'TO_PICKUP', ?)`,
      [
        data.orderId,
        data.purchaseOrderId,
        data.carrierId,
        data.pickupAddressId,
        data.deliveryAddressId,
        data.scheduledPickupAt,
      ],
      db,
    );
    return result.insertId;
  },

  findById: (db: Db, id: number) => queryOne<ShipmentRow>('SELECT * FROM shipments WHERE id = ?', [id], db),

  findByIdForUpdate: (db: Db, id: number) =>
    queryOne<ShipmentRow>('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [id], db),

  async setStatus(db: Db, id: number, status: ShipmentStatus): Promise<void> {
    await exec('UPDATE shipments SET shipment_status = ? WHERE id = ?', [status, id], db);
  },

  async markCollected(db: Db, id: number): Promise<void> {
    await exec("UPDATE shipments SET shipment_status = 'COLLECTED', picked_up_at = NOW() WHERE id = ?", [id], db);
  },

  async markDelivered(db: Db, id: number, photoPath: string | null, signaturePath: string | null): Promise<void> {
    await exec(
      `UPDATE shipments SET shipment_status = 'DELIVERED', delivered_at = NOW(),
              pod_photo_url = ?, pod_signature_url = ? WHERE id = ?`,
      [photoPath, signaturePath, id],
      db,
    );
  },

  async reassign(db: Db, id: number, carrierId: number): Promise<void> {
    await exec("UPDATE shipments SET carrier_id = ?, shipment_status = 'TO_PICKUP' WHERE id = ?", [carrierId, id], db);
  },

  /** Cancela a guia (ex: a ordem de compra associada foi cancelada/reatribuída). Só antes da recolha. */
  async cancel(db: Db, id: number): Promise<void> {
    await exec("UPDATE shipments SET shipment_status = 'CANCELLED' WHERE id = ?", [id], db);
  },

  findByPurchaseOrderForUpdate: (db: Db, purchaseOrderId: number) =>
    queryOne<ShipmentRow>('SELECT * FROM shipments WHERE purchase_order_id = ? FOR UPDATE', [purchaseOrderId], db),

  async countByOrder(db: Db, orderId: number): Promise<{ total: number; delivered: number }> {
    const row = await queryOne<{ total: number; delivered: number | null }>(
      `SELECT COUNT(*) AS total, SUM(shipment_status = 'DELIVERED') AS delivered
       FROM shipments WHERE order_id = ?`,
      [orderId],
      db,
    );
    return { total: row?.total ?? 0, delivered: row?.delivered ?? 0 };
  },

  findViewById: (id: number) => queryOne<ShipmentListRow>(`${SELECT_SHIPMENT} WHERE s.id = ?`, [id]),

  async list(
    filters: { carrierId?: number; status?: string; orderId?: number },
    limit: number,
    offset: number,
  ): Promise<{ rows: ShipmentListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.carrierId) {
      conditions.push('s.carrier_id = ?');
      params.push(filters.carrierId);
    }
    if (filters.status) {
      conditions.push('s.shipment_status = ?');
      params.push(filters.status);
    }
    if (filters.orderId) {
      conditions.push('s.order_id = ?');
      params.push(filters.orderId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query<ShipmentListRow>(
      `${SELECT_SHIPMENT} ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const count = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM shipments s ${where}`, params);
    return { rows, total: count?.total ?? 0 };
  },

  async getItems(poIds: number[]): Promise<ShipmentItemRow[]> {
    if (!poIds.length) return [];
    return query<ShipmentItemRow>(
      `SELECT poi.purchase_order_id, p.name AS product_name, poi.quantity, poi.unit
       FROM purchase_order_items poi
       JOIN order_items oi ON oi.id = poi.order_item_id
       JOIN products p ON p.id = oi.product_id
       WHERE poi.purchase_order_id IN (?) ORDER BY poi.id`,
      [poIds],
    );
  },
};

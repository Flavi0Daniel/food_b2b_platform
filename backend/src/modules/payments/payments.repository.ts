import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';

export interface PaymentRow {
  id: number;
  order_id: number;
  method: 'MULTICAIXA_EXPRESS' | 'TRANSFERENCIA';
  amount: number;
  proof_url: string | null;
  transaction_ref: string | null;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  validated_by: number | null;
  validated_at: string | null;
  created_at: string;
}

export interface PaymentListRow extends PaymentRow {
  order_number: string;
  order_total: number;
  client_name: string;
  client_company: string | null;
}

export const paymentsRepository = {
  async insert(
    db: Db,
    data: {
      orderId: number;
      method: string;
      amount: number;
      proofUrl: string | null;
      transactionRef: string | null;
    },
  ): Promise<number> {
    const result = await exec(
      `INSERT INTO payments (order_id, method, amount, proof_url, transaction_ref, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [data.orderId, data.method, data.amount, data.proofUrl, data.transactionRef],
      db,
    );
    return result.insertId;
  },

  findById: (db: Db, id: number) => queryOne<PaymentRow>('SELECT * FROM payments WHERE id = ?', [id], db),

  findByIdForUpdate: (db: Db, id: number) =>
    queryOne<PaymentRow>('SELECT * FROM payments WHERE id = ? FOR UPDATE', [id], db),

  /** Uma referência de transação só pode servir para um pagamento não rejeitado (anti-reutilização). */
  findActiveByReference: (db: Db, reference: string) =>
    queryOne<{ id: number }>(
      "SELECT id FROM payments WHERE transaction_ref = ? AND status <> 'REJECTED' LIMIT 1",
      [reference],
      db,
    ),

  async markValidated(db: Db, id: number, validatorId: number): Promise<void> {
    await exec(
      "UPDATE payments SET status = 'VALIDATED', validated_by = ?, validated_at = NOW() WHERE id = ?",
      [validatorId, id],
      db,
    );
  },

  async markRejected(db: Db, id: number, validatorId: number): Promise<void> {
    await exec(
      "UPDATE payments SET status = 'REJECTED', validated_by = ?, validated_at = NOW() WHERE id = ?",
      [validatorId, id],
      db,
    );
  },

  async list(
    filters: { status?: string; orderId?: number },
    limit: number,
    offset: number,
  ): Promise<{ rows: PaymentListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      conditions.push('p.status = ?');
      params.push(filters.status);
    }
    if (filters.orderId) {
      conditions.push('p.order_id = ?');
      params.push(filters.orderId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query<PaymentListRow>(
      `SELECT p.*, o.order_number, o.total_amount AS order_total, u.name AS client_name,
              u.company_name AS client_company
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN users u ON u.id = o.client_id
       ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const count = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM payments p ${where}`, params);
    return { rows, total: count?.total ?? 0 };
  },
};

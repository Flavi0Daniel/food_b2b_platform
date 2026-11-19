import { Db, pool } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';

export interface SupplierProductRow {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_company: string | null;
  product_id: number;
  product_name: string;
  category_name: string;
  base_unit: string;
  cost_price: number;
  is_active: boolean;
  updated_at: string;
}

const SELECT_ROW = `SELECT sp.id, sp.supplier_id, u.name AS supplier_name, u.company_name AS supplier_company,
                           sp.product_id, p.name AS product_name, c.name AS category_name, p.base_unit,
                           sp.cost_price, sp.is_active, sp.updated_at
                    FROM supplier_products sp
                    JOIN users u ON u.id = sp.supplier_id
                    JOIN products p ON p.id = sp.product_id
                    JOIN categories c ON c.id = p.category_id`;

export const supplierProductsRepository = {
  list(filters: { supplierId?: number; productId?: number }): Promise<SupplierProductRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.supplierId) {
      conditions.push('sp.supplier_id = ?');
      params.push(filters.supplierId);
    }
    if (filters.productId) {
      conditions.push('sp.product_id = ?');
      params.push(filters.productId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query<SupplierProductRow>(`${SELECT_ROW} ${where} ORDER BY p.name ASC, sp.cost_price ASC`, params);
  },

  async upsert(
    supplierId: number,
    productId: number,
    costPrice: number,
    isActive: boolean,
    db: Db = pool,
  ): Promise<SupplierProductRow> {
    await exec(
      `INSERT INTO supplier_products (supplier_id, product_id, cost_price, is_active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price), is_active = VALUES(is_active)`,
      [supplierId, productId, costPrice, isActive],
      db,
    );
    return (await queryOne<SupplierProductRow>(
      `${SELECT_ROW} WHERE sp.supplier_id = ? AND sp.product_id = ?`,
      [supplierId, productId],
      db,
    ))!;
  },

  /** Desativa os preços ATIVOS de um produto (ex: a unidade mudou) e devolve os fornecedores afetados. */
  async deactivateAllForProduct(productId: number, db: Db = pool): Promise<number[]> {
    const rows = await query<{ supplier_id: number }>(
      'SELECT supplier_id FROM supplier_products WHERE product_id = ? AND is_active = TRUE',
      [productId],
      db,
    );
    if (rows.length) {
      await exec('UPDATE supplier_products SET is_active = FALSE WHERE product_id = ? AND is_active = TRUE', [productId], db);
    }
    return rows.map((r) => r.supplier_id);
  },

  /** Preço atual (antes de ser substituído), para detetar aumentos. */
  findCurrent: (supplierId: number, productId: number, db: Db = pool) =>
    queryOne<{ cost_price: number; is_active: boolean }>(
      'SELECT cost_price, is_active FROM supplier_products WHERE supplier_id = ? AND product_id = ?',
      [supplierId, productId],
      db,
    ),

  /** Encomendas ainda por aprovar que incluem este produto: são as que um aumento pode surpreender. */
  async countAwaitingApprovalWithProduct(productId: number, db: Db = pool): Promise<number> {
    const row = await queryOne<{ total: number }>(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.order_status = 'AWAITING_APPROVAL' AND oi.product_id = ?`,
      [productId],
      db,
    );
    return row?.total ?? 0;
  },

  supplierExists: (id: number) =>
    queryOne<{ id: number; name: string; company_name: string | null }>(
      "SELECT id, name, company_name FROM users WHERE id = ? AND role = 'SUPPLIER'",
      [id],
    ),
  productExists: (id: number) => queryOne<{ id: number; name: string }>('SELECT id, name FROM products WHERE id = ?', [id]),
};

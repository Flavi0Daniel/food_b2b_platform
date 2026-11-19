import { Db, pool } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './products.schema';

export interface ProductRecord {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  base_unit: string;
  image_url: string | null;
  is_available: boolean;
  sell_price: number | null;
  created_at: string;
  updated_at: string;
}

const SELECT_PRODUCT = `SELECT p.*, c.name AS category_name
                        FROM products p JOIN categories c ON c.id = p.category_id`;

export const productsRepository = {
  async create(dto: CreateProductDto): Promise<ProductRecord> {
    const result = await exec(
      `INSERT INTO products (category_id, name, description, base_unit, image_url, sell_price, is_available)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [dto.categoryId, dto.name, dto.description ?? null, dto.baseUnit, dto.imageUrl ?? null, dto.sellPrice ?? null],
    );
    const created = await this.findById(result.insertId);
    if (!created) throw new Error('Falha ao carregar produto recém-criado');
    return created;
  },

  findById(id: number, db: Db = pool): Promise<ProductRecord | null> {
    return queryOne<ProductRecord>(`${SELECT_PRODUCT} WHERE p.id = ? LIMIT 1`, [id], db);
  },

  /** Bloqueia a linha do produto até ao fim da transação (serializa com a criação de encomendas). */
  lockById: (id: number, db: Db) =>
    queryOne<{ id: number; base_unit: string }>('SELECT id, base_unit FROM products WHERE id = ? FOR UPDATE', [id], db),

  /** Encomendas ainda não concluídas (nem canceladas) que incluem o produto. */
  async countOpenOrdersWithProduct(id: number, db: Db = pool): Promise<number> {
    const row = await queryOne<{ total: number }>(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE oi.product_id = ? AND o.order_status NOT IN ('DELIVERED', 'CANCELLED')`,
      [id],
      db,
    );
    return row?.total ?? 0;
  },

  async updateUnit(id: number, baseUnit: string, db: Db = pool): Promise<void> {
    await exec('UPDATE products SET base_unit = ? WHERE id = ?', [baseUnit, id], db);
  },

  list(filters: ListProductsQuery): Promise<ProductRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.categoryId) {
      conditions.push('p.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.onlyAvailable) {
      conditions.push('p.is_available = TRUE');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return query<ProductRecord>(`${SELECT_PRODUCT} ${where} ORDER BY p.name ASC`, params);
  },

  /** Os nomes das colunas são fixos no código: nunca vêm do input do utilizador. */
  async update(id: number, dto: UpdateProductDto): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      params.push(dto.description === '' ? null : dto.description);
    }
    if (dto.categoryId !== undefined) {
      sets.push('category_id = ?');
      params.push(dto.categoryId);
    }
    if (!sets.length) return;
    await exec(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  },

  categoryExists(id: number): Promise<{ id: number } | null> {
    return queryOne<{ id: number }>('SELECT id FROM categories WHERE id = ?', [id]);
  },

  async updateImage(id: number, imageUrl: string | null): Promise<void> {
    await exec('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, id]);
  },

  async updateAvailability(id: number, isAvailable: boolean): Promise<void> {
    await exec('UPDATE products SET is_available = ? WHERE id = ?', [isAvailable, id]);
  },

  async updatePrice(id: number, sellPrice: number): Promise<void> {
    await exec('UPDATE products SET sell_price = ? WHERE id = ?', [sellPrice, id]);
  },
};

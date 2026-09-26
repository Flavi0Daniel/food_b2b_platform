import { pool } from '../../config/database';
import { CreateProductDto, ListProductsQuery } from './products.schema';

export interface ProductRecord {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  base_unit: string;
  image_url: string | null;
  is_available: boolean;
  sell_price: string | null;
  created_at: string;
  updated_at: string;
}

export const productsRepository = {
  async create(dto: CreateProductDto): Promise<ProductRecord> {
    const [result] = await pool.query(
      `INSERT INTO products (category_id, name, description, base_unit, image_url, sell_price, is_available)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [dto.categoryId, dto.name, dto.description ?? null, dto.baseUnit, dto.imageUrl ?? null, dto.sellPrice ?? null],
    );
    const insertId = (result as { insertId: number }).insertId;
    const created = await this.findById(insertId);
    if (!created) throw new Error('Falha ao carregar produto recém-criado');
    return created;
  },

  async findById(id: number): Promise<ProductRecord | null> {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    const products = rows as ProductRecord[];
    return products[0] ?? null;
  },

  async list(filters: ListProductsQuery): Promise<ProductRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.categoryId) {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.onlyAvailable) {
      conditions.push('is_available = TRUE');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM products ${whereClause} ORDER BY name ASC`,
      params,
    );
    return rows as ProductRecord[];
  },

  async updateAvailability(id: number, isAvailable: boolean): Promise<void> {
    await pool.query('UPDATE products SET is_available = ? WHERE id = ?', [isAvailable, id]);
  },
};

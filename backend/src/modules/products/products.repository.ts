import { exec, query, queryOne } from '../../common/utils/db';
import { CreateProductDto, ListProductsQuery } from './products.schema';

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

  findById(id: number): Promise<ProductRecord | null> {
    return queryOne<ProductRecord>(`${SELECT_PRODUCT} WHERE p.id = ? LIMIT 1`, [id]);
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

  async updateAvailability(id: number, isAvailable: boolean): Promise<void> {
    await exec('UPDATE products SET is_available = ? WHERE id = ?', [isAvailable, id]);
  },

  async updatePrice(id: number, sellPrice: number): Promise<void> {
    await exec('UPDATE products SET sell_price = ? WHERE id = ?', [sellPrice, id]);
  },
};

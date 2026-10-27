import { exec, query, queryOne } from '../../common/utils/db';

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export const categoriesRepository = {
  findById: (id: number) => queryOne<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [id]),

  async update(id: number, name: string, slug: string): Promise<void> {
    await exec('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
  },

  async countProducts(id: number): Promise<number> {
    const row = await queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM products WHERE category_id = ?', [id]);
    return row?.total ?? 0;
  },

  async delete(id: number): Promise<void> {
    await exec('DELETE FROM categories WHERE id = ?', [id]);
  },

  list: () => query<CategoryRecord>('SELECT * FROM categories ORDER BY name ASC'),
  findBySlug: (slug: string) => queryOne<CategoryRecord>('SELECT * FROM categories WHERE slug = ?', [slug]),
  async create(name: string, slug: string): Promise<CategoryRecord> {
    const result = await exec('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    return (await queryOne<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [result.insertId]))!;
  },
};

import { exec, query, queryOne } from '../../common/utils/db';

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export const categoriesRepository = {
  list: () => query<CategoryRecord>('SELECT * FROM categories ORDER BY name ASC'),
  findBySlug: (slug: string) => queryOne<CategoryRecord>('SELECT * FROM categories WHERE slug = ?', [slug]),
  async create(name: string, slug: string): Promise<CategoryRecord> {
    const result = await exec('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    return (await queryOne<CategoryRecord>('SELECT * FROM categories WHERE id = ?', [result.insertId]))!;
  },
};

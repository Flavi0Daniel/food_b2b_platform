import { AppError } from '../../common/errors/AppError';
import { isReferencedRow } from '../../common/utils/db';
import { categoriesRepository, CategoryRecord } from './categories.repository';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const categoriesService = {
  list: (): Promise<CategoryRecord[]> => categoriesRepository.list(),

  async create(name: string): Promise<CategoryRecord> {
    const slug = slugify(name);
    if (!slug) throw AppError.badRequest('Nome de categoria inválido');
    if (await categoriesRepository.findBySlug(slug)) {
      throw AppError.conflict('Já existe uma categoria com este nome');
    }
    return categoriesRepository.create(name, slug);
  },

  async rename(id: number, name: string): Promise<CategoryRecord> {
    const category = await categoriesRepository.findById(id);
    if (!category) throw AppError.notFound('Categoria não encontrada');

    const slug = slugify(name);
    if (!slug) throw AppError.badRequest('Nome de categoria inválido');

    const sameSlug = await categoriesRepository.findBySlug(slug);
    if (sameSlug && sameSlug.id !== id) throw AppError.conflict('Já existe uma categoria com este nome');

    await categoriesRepository.update(id, name, slug);
    return (await categoriesRepository.findById(id))!;
  },

  /** Só se elimina uma categoria vazia: os produtos têm de ser movidos para outra antes. */
  async remove(id: number): Promise<void> {
    const category = await categoriesRepository.findById(id);
    if (!category) throw AppError.notFound('Categoria não encontrada');

    const inUse = await categoriesRepository.countProducts(id);
    if (inUse > 0) {
      throw AppError.conflict(
        `Esta categoria tem ${inUse} produto(s) e não pode ser eliminada. Mude esses produtos para outra categoria primeiro.`,
      );
    }

    try {
      await categoriesRepository.delete(id);
    } catch (err) {
      // Produto criado entre a contagem e o DELETE: a chave estrangeira protege-nos.
      if (isReferencedRow(err)) throw AppError.conflict('Esta categoria está em uso e não pode ser eliminada.');
      throw err;
    }
  },
};

import { AppError } from '../../common/errors/AppError';
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
};

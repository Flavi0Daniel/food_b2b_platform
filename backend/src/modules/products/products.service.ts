import { AppError } from '../../common/errors/AppError';
import { productsRepository, ProductRecord } from './products.repository';
import { CreateProductDto, ListProductsQuery } from './products.schema';

export const productsService = {
  async createProduct(dto: CreateProductDto): Promise<ProductRecord> {
    return productsRepository.create(dto);
  },

  async listCatalog(filters: ListProductsQuery): Promise<ProductRecord[]> {
    return productsRepository.list(filters);
  },

  async setAvailability(id: number, isAvailable: boolean): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');

    await productsRepository.updateAvailability(id, isAvailable);
    const updated = await productsRepository.findById(id);
    return updated!;
  },
};

import { AppError } from '../../common/errors/AppError';
import { isStaff, UserRole } from '../../common/types';
import { productsRepository, ProductRecord } from './products.repository';
import { CreateProductDto, ListProductsQuery } from './products.schema';

/** Fornecedores e transportadoras não precisam do preço de venda: nunca o recebem. */
function forRole(product: ProductRecord, role: UserRole): Partial<ProductRecord> {
  if (isStaff(role) || role === 'CLIENT') return product;
  const { sell_price: _sellPrice, ...rest } = product;
  return rest;
}

export const productsService = {
  async createProduct(dto: CreateProductDto): Promise<ProductRecord> {
    return productsRepository.create(dto);
  },

  async listCatalog(filters: ListProductsQuery, role: UserRole): Promise<Partial<ProductRecord>[]> {
    // Clientes só veem o catálogo disponível; a equipa interna vê tudo
    const onlyAvailable = role === 'CLIENT' ? true : filters.onlyAvailable;
    const products = await productsRepository.list({ ...filters, onlyAvailable });
    return products.map((p) => forRole(p, role));
  },

  async setAvailability(id: number, isAvailable: boolean): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');
    if (isAvailable && product.sell_price === null) {
      throw AppError.badRequest('Defina o preço de venda antes de disponibilizar o produto');
    }

    await productsRepository.updateAvailability(id, isAvailable);
    return (await productsRepository.findById(id))!;
  },

  async setPrice(id: number, sellPrice: number): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');

    await productsRepository.updatePrice(id, sellPrice);
    return (await productsRepository.findById(id))!;
  },
};

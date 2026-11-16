import { AppError } from '../../common/errors/AppError';
import { isStaff, UserRole } from '../../common/types';
import { deleteStoredProductImage } from '../../common/middlewares/upload.middleware';
import { productImageUrl } from '../../common/utils/files';
import { productsRepository, ProductRecord } from './products.repository';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './products.schema';

/** Fornecedores e transportadoras não precisam do preço de venda: nunca o recebem. */
function forRole(product: ProductRecord, role: UserRole): Partial<ProductRecord> {
  if (isStaff(role) || role === 'CLIENT') return product;
  const { sell_price: _sellPrice, ...rest } = product;
  return rest;
}

/** Troca o caminho guardado na BD pelo URL público da foto (as respostas nunca expõem o caminho interno). */
function present<T extends { image_url?: string | null }>(product: T): T {
  return { ...product, image_url: productImageUrl(product.image_url) };
}

export const productsService = {
  async createProduct(dto: CreateProductDto): Promise<ProductRecord> {
    return present(await productsRepository.create(dto));
  },

  async listCatalog(filters: ListProductsQuery, role: UserRole): Promise<Partial<ProductRecord>[]> {
    // Clientes só veem o catálogo disponível; a equipa interna vê tudo
    const onlyAvailable = role === 'CLIENT' ? true : filters.onlyAvailable;
    const products = await productsRepository.list({ ...filters, onlyAvailable });
    return products.map((p) => present(forRole(p, role)));
  },

  async updateProduct(id: number, dto: UpdateProductDto): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');

    if (dto.categoryId !== undefined && !(await productsRepository.categoryExists(dto.categoryId))) {
      throw AppError.badRequest('Categoria inválida');
    }

    await productsRepository.update(id, dto);
    return present((await productsRepository.findById(id))!);
  },

  async setAvailability(id: number, isAvailable: boolean): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');
    if (isAvailable && product.sell_price === null) {
      throw AppError.badRequest('Defina o preço de venda antes de disponibilizar o produto');
    }

    await productsRepository.updateAvailability(id, isAvailable);
    return present((await productsRepository.findById(id))!);
  },

  async setPrice(id: number, sellPrice: number): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');

    await productsRepository.updatePrice(id, sellPrice);
    return present((await productsRepository.findById(id))!);
  },

  /** `storedPath` é 'products/<uuid>.<ext>', já gravado em disco e verificado pelo middleware. */
  async setImage(id: number, storedPath: string): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');

    await productsRepository.updateImage(id, storedPath);
    await deleteStoredProductImage(product.image_url); // a foto anterior deixa de ser precisa
    return present((await productsRepository.findById(id))!);
  },

  async removeImage(id: number): Promise<ProductRecord> {
    const product = await productsRepository.findById(id);
    if (!product) throw AppError.notFound('Produto não encontrado');
    if (!product.image_url) return present(product);

    await productsRepository.updateImage(id, null);
    await deleteStoredProductImage(product.image_url);
    return present((await productsRepository.findById(id))!);
  },
};

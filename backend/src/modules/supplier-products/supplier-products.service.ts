import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { supplierProductsRepository, SupplierProductRow } from './supplier-products.repository';
import { ListSupplierProductsQuery, UpsertSupplierProductDto } from './supplier-products.schema';

export const supplierProductsService = {
  list(actor: JwtUserPayload, filters: ListSupplierProductsQuery): Promise<SupplierProductRow[]> {
    // Fornecedor só vê a sua própria tabela de custos; staff pode filtrar por qualquer fornecedor/produto
    if (!isStaff(actor.role)) return supplierProductsRepository.list({ supplierId: actor.id });
    return supplierProductsRepository.list(filters);
  },

  async upsert(supplierId: number, productId: number, dto: UpsertSupplierProductDto): Promise<SupplierProductRow> {
    if (!(await supplierProductsRepository.supplierExists(supplierId))) {
      throw AppError.notFound('Fornecedor não encontrado');
    }
    if (!(await supplierProductsRepository.productExists(productId))) {
      throw AppError.notFound('Produto não encontrado');
    }
    return supplierProductsRepository.upsert(supplierId, productId, dto.costPrice, dto.isActive);
  },
};

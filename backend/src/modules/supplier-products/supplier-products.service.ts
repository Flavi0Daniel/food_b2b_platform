import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { toCents } from '../../common/utils/money';
import { withTransaction } from '../../config/database';
import { notificationsRepository } from '../notifications/notifications.repository';
import { buildPriceIncreaseMessage } from './price-alert';
import { supplierProductsRepository, SupplierProductRow } from './supplier-products.repository';
import { ListSupplierProductsQuery, UpsertSupplierProductDto } from './supplier-products.schema';

export interface UpsertOptions {
  /** Quando quem altera é o próprio fornecedor: avisa a equipa se o custo SUBIR (nunca se descer). */
  alertStaffOnIncrease?: boolean;
}

export const supplierProductsService = {
  list(actor: JwtUserPayload, filters: ListSupplierProductsQuery): Promise<SupplierProductRow[]> {
    // Fornecedor só vê a sua própria tabela de custos; staff pode filtrar por qualquer fornecedor/produto
    if (!isStaff(actor.role)) return supplierProductsRepository.list({ supplierId: actor.id });
    return supplierProductsRepository.list(filters);
  },

  async upsert(
    supplierId: number,
    productId: number,
    dto: UpsertSupplierProductDto,
    options: UpsertOptions = {},
  ): Promise<SupplierProductRow> {
    const supplier = await supplierProductsRepository.supplierExists(supplierId);
    if (!supplier) throw AppError.notFound('Fornecedor não encontrado');
    const product = await supplierProductsRepository.productExists(productId);
    if (!product) throw AppError.notFound('Produto não encontrado');

    // Atualização do preço e alerta na MESMA transação: nunca fica um aumento sem aviso (nem um aviso sem aumento).
    return withTransaction(async (conn) => {
      const previous = await supplierProductsRepository.findCurrent(supplierId, productId, conn);
      const row = await supplierProductsRepository.upsert(supplierId, productId, dto.costPrice, dto.isActive, conn);

      const increased = !!previous && toCents(dto.costPrice) > toCents(previous.cost_price);
      if (options.alertStaffOnIncrease && previous && increased && dto.isActive) {
        const pendingOrders = await supplierProductsRepository.countAwaitingApprovalWithProduct(productId, conn);
        await notificationsRepository.notifyStaff(conn, {
          title: 'Fornecedor aumentou o preço de custo',
          message: buildPriceIncreaseMessage({
            supplierLabel: supplier.company_name || supplier.name,
            productName: product.name,
            oldCost: previous.cost_price,
            newCost: dto.costPrice,
            pendingOrders,
          }),
          type: 'SUPPLIER_PRICE_INCREASE',
        });
      }
      return row;
    });
  },
};

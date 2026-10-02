import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  listSupplierProductsQuerySchema,
  productParamSchema,
  supplierProductParamSchema,
  upsertSupplierProductSchema,
} from './supplier-products.schema';
import { supplierProductsService } from './supplier-products.service';

const router = Router();
router.use(authMiddleware);

// FORNECEDOR: a sua tabela de preços de custo. STAFF: consulta (filtros supplierId / productId).
router.get(
  '/',
  authorize('SUPPLIER', 'ADMIN', 'OPERATOR'),
  validate({ query: listSupplierProductsQuerySchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await supplierProductsService.list(req.user!, req.query as never), 'Preços de custo obtidos');
  }),
);

// FORNECEDOR: define/atualiza o seu preço de custo e ativa/desativa o produto
router.put(
  '/me/:productId',
  authorize('SUPPLIER'),
  validate({ params: productParamSchema, body: upsertSupplierProductSchema }),
  asyncHandler(async (req, res) => {
    const row = await supplierProductsService.upsert(req.user!.id, Number(req.params.productId), req.body);
    sendSuccess(res, row, 'Preço de custo atualizado');
  }),
);

// ADMIN: gere o preço de custo acordado com qualquer fornecedor
router.put(
  '/:supplierId/:productId',
  authorize('ADMIN'),
  validate({ params: supplierProductParamSchema, body: upsertSupplierProductSchema }),
  asyncHandler(async (req, res) => {
    const { supplierId, productId } = req.params;
    const row = await supplierProductsService.upsert(Number(supplierId), Number(productId), req.body);
    sendSuccess(res, row, 'Preço de custo atualizado');
  }),
);

export default router;

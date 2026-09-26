import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * TODO (próxima etapa): ordens de compra cegas ao fornecedor.
 *
 *  GET   /api/purchase-orders               -> SUPPLIER vê só as suas; ADMIN vê todas
 *  PATCH /api/purchase-orders/:id/status    -> SUPPLIER atualiza:
 *        RECEIVED -> IN_PREPARATION -> READY_FOR_PICKUP -> COLLECTED
 *
 * Importante: o SUPPLIER nunca deve receber dados do cliente final nesta
 * camada (isolamento de dados da intermediação cega).
 */
router.all(
  '*',
  authorize('ADMIN', 'SUPPLIER'),
  asyncHandler(async () => {
    throw AppError.badRequest('Módulo de ordens de compra ainda não implementado - próxima etapa');
  }),
);

export default router;

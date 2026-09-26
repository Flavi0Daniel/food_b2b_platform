import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * TODO (próxima etapa): logística e comprovativo de entrega.
 *
 *  GET   /api/shipments                  -> CARRIER vê as suas rotas; ADMIN vê todas
 *  PATCH /api/shipments/:id/status       -> CARRIER atualiza:
 *        TO_PICKUP -> COLLECTED -> IN_TRANSIT -> DELIVERED
 *  POST  /api/shipments/:id/pod          -> CARRIER faz upload de foto/assinatura (POD)
 *
 * Ao marcar DELIVERED, orders.order_status deve avançar para DELIVERED.
 */
router.all(
  '*',
  authorize('ADMIN', 'CARRIER'),
  asyncHandler(async () => {
    throw AppError.badRequest('Módulo de logística ainda não implementado - próxima etapa');
  }),
);

export default router;

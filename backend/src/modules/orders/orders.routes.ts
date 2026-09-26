import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * TODO (próxima etapa): implementar o fluxo completo de encomendas.
 *
 *  POST   /api/orders                -> CLIENT cria encomenda (orders + order_items numa transação)
 *  GET    /api/orders                -> CLIENT vê as suas próprias; ADMIN/OPERATOR veem todas
 *  GET    /api/orders/:id            -> detalhe da encomenda + itens + histórico de estado
 *  PATCH  /api/orders/:id/approve    -> ADMIN aprova (após validar pagamento) e dispara
 *                                        criação de purchase_orders + shipments
 *  PATCH  /api/orders/:id/cancel     -> cancela a encomenda
 *
 * Cada mudança de estado deve gravar uma linha em order_status_history.
 */
router.all(
  '*',
  authorize('ADMIN', 'OPERATOR', 'CLIENT'),
  asyncHandler(async () => {
    throw AppError.badRequest('Módulo de encomendas ainda não implementado - próxima etapa');
  }),
);

export default router;

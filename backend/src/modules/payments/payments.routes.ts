import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * TODO (próxima etapa): validação financeira manual.
 *
 *  POST  /api/payments                  -> CLIENT envia comprovativo/referência da transação
 *  GET   /api/payments?status=PENDING   -> ADMIN vê a fila de validação
 *  PATCH /api/payments/:id/validate     -> ADMIN valida manualmente (seta validated_by/validated_at
 *                                           e avança orders.payment_status para VALIDATED)
 *  PATCH /api/payments/:id/reject       -> ADMIN rejeita, pedindo novo comprovativo ao cliente
 */
router.all(
  '*',
  authorize('ADMIN', 'CLIENT'),
  asyncHandler(async () => {
    throw AppError.badRequest('Módulo de pagamentos ainda não implementado - próxima etapa');
  }),
);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { idempotent } from '../../common/middlewares/idempotency.middleware';
import { sensitiveWriteLimiter } from '../../common/middlewares/rateLimit.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { ordersController } from './orders.controller';
import {
  approveOrderSchema,
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from './orders.schema';

const router = Router();
router.use(authMiddleware);

// CLIENTE cria encomenda (exige X-Idempotency-Key: evita encomendas duplicadas por duplo clique/retry)
router.post(
  '/',
  authorize('CLIENT'),
  sensitiveWriteLimiter,
  validate({ body: createOrderSchema }),
  idempotent,
  ordersController.create,
);

// CLIENTE vê as suas; ADMIN/OPERATOR veem todas
router.get(
  '/',
  authorize('CLIENT', 'ADMIN', 'OPERATOR'),
  validate({ query: listOrdersQuerySchema }),
  ordersController.list,
);
router.get(
  '/:id',
  authorize('CLIENT', 'ADMIN', 'OPERATOR'),
  validate({ params: orderIdParamSchema }),
  ordersController.get,
);

router.post(
  '/:id/cancel',
  authorize('CLIENT', 'ADMIN', 'OPERATOR'),
  validate({ params: orderIdParamSchema, body: cancelOrderSchema }),
  ordersController.cancel,
);

// ADMIN/OPERATOR aprovam (pagamento já validado): cria ordens de compra e guias de transporte
router.post(
  '/:id/approve',
  authorize('ADMIN', 'OPERATOR'),
  validate({ params: orderIdParamSchema, body: approveOrderSchema }),
  idempotent,
  ordersController.approve,
);

export default router;

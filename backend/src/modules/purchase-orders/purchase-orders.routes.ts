import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { purchaseOrdersController } from './purchase-orders.controller';
import {
  cancelPoSchema,
  listPurchaseOrdersQuerySchema,
  poIdParamSchema,
  reassignPoSchema,
  updatePoStatusSchema,
} from './purchase-orders.schema';

const router = Router();
router.use(authMiddleware);

// SUPPLIER vê só as suas ordens (sem dados do cliente); ADMIN/OPERATOR veem todas
router.get(
  '/',
  authorize('SUPPLIER', 'ADMIN', 'OPERATOR'),
  validate({ query: listPurchaseOrdersQuerySchema }),
  purchaseOrdersController.list,
);
router.get(
  '/:id',
  authorize('SUPPLIER', 'ADMIN', 'OPERATOR'),
  validate({ params: poIdParamSchema }),
  purchaseOrdersController.get,
);

// SUPPLIER: RECEIVED → IN_PREPARATION → READY_FOR_PICKUP
router.patch(
  '/:id/status',
  authorize('SUPPLIER'),
  validate({ params: poIdParamSchema, body: updatePoStatusSchema }),
  purchaseOrdersController.updateStatus,
);

// ADMIN/OPERATOR: cancelar uma ordem de compra ainda não recolhida
router.post(
  '/:id/cancel',
  authorize('ADMIN', 'OPERATOR'),
  validate({ params: poIdParamSchema, body: cancelPoSchema }),
  purchaseOrdersController.cancel,
);

// ADMIN/OPERATOR: reatribuir a mercadoria a outro fornecedor (cancela esta e cria uma nova ordem)
router.post(
  '/:id/reassign',
  authorize('ADMIN', 'OPERATOR'),
  validate({ params: poIdParamSchema, body: reassignPoSchema }),
  purchaseOrdersController.reassign,
);

export default router;

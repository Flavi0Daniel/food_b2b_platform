import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { uploadPod, verifyUploadedFiles } from '../../common/middlewares/upload.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { shipmentsController } from './shipments.controller';
import {
  deliverBodySchema,
  listShipmentsQuerySchema,
  reassignCarrierSchema,
  shipmentIdParamSchema,
  updateShipmentStatusSchema,
} from './shipments.schema';

const router = Router();
router.use(authMiddleware);

// CARRIER vê só as suas guias (cegas); ADMIN/OPERATOR veem todas
router.get(
  '/',
  authorize('CARRIER', 'ADMIN', 'OPERATOR'),
  validate({ query: listShipmentsQuerySchema }),
  shipmentsController.list,
);
router.get(
  '/:id',
  authorize('CARRIER', 'ADMIN', 'OPERATOR'),
  validate({ params: shipmentIdParamSchema }),
  shipmentsController.get,
);

// CARRIER: TO_PICKUP → COLLECTED → IN_TRANSIT (ou FAILED)
router.patch(
  '/:id/status',
  authorize('CARRIER'),
  validate({ params: shipmentIdParamSchema, body: updateShipmentStatusSchema }),
  shipmentsController.updateStatus,
);

// CARRIER: conclui a entrega com POD (multipart: `photo` e/ou `signature`)
router.post(
  '/:id/deliver',
  authorize('CARRIER'),
  validate({ params: shipmentIdParamSchema }), // antes do upload: pedido inválido não grava ficheiros
  uploadPod,
  verifyUploadedFiles,
  validate({ body: deliverBodySchema }),
  shipmentsController.deliver,
);

// STAFF: troca de transportadora antes da recolha
router.patch(
  '/:id/carrier',
  authorize('ADMIN', 'OPERATOR'),
  validate({ params: shipmentIdParamSchema, body: reassignCarrierSchema }),
  shipmentsController.reassign,
);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { idempotent } from '../../common/middlewares/idempotency.middleware';
import { sensitiveWriteLimiter } from '../../common/middlewares/rateLimit.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { uploadPaymentProof, verifyUploadedFiles } from '../../common/middlewares/upload.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { paymentsController } from './payments.controller';
import {
  listPaymentsQuerySchema,
  paymentIdParamSchema,
  rejectPaymentSchema,
  submitPaymentSchema,
  validatePaymentSchema,
} from './payments.schema';

const router = Router();
router.use(authMiddleware);

// CLIENTE envia comprovativo (multipart: proof + orderId, method, transactionRef). Exige X-Idempotency-Key.
router.post(
  '/',
  authorize('CLIENT'),
  sensitiveWriteLimiter,
  uploadPaymentProof,
  verifyUploadedFiles,
  validate({ body: submitPaymentSchema }),
  idempotent,
  paymentsController.submit,
);

// STAFF consulta a fila de validação
router.get(
  '/',
  authorize('ADMIN', 'OPERATOR'),
  validate({ query: listPaymentsQuerySchema }),
  paymentsController.list,
);

// Só o ADMIN confirma/rejeita que o dinheiro entrou (para permitir ao OPERATOR: authorize('ADMIN', 'OPERATOR'))
router.post(
  '/:id/validate',
  authorize('ADMIN'),
  validate({ params: paymentIdParamSchema, body: validatePaymentSchema }),
  paymentsController.validate,
);
router.post(
  '/:id/reject',
  authorize('ADMIN'),
  validate({ params: paymentIdParamSchema, body: rejectPaymentSchema }),
  paymentsController.reject,
);

export default router;

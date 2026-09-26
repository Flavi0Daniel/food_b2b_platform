import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { productsController } from './products.controller';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateAvailabilitySchema,
} from './products.schema';

const router = Router();

router.use(authMiddleware);

// Catálogo - qualquer utilizador autenticado pode consultar (Cliente vê só disponíveis)
router.get('/', validate({ query: listProductsQuerySchema }), productsController.list);

// Gestão do catálogo - só ADMIN
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: createProductSchema }),
  productsController.create,
);

router.patch(
  '/:id/availability',
  authorize('ADMIN'),
  validate({ params: productIdParamSchema, body: updateAvailabilitySchema }),
  productsController.updateAvailability,
);

export default router;

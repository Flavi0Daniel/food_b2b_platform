import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { uploadProductImage, verifyUploadedFiles } from '../../common/middlewares/upload.middleware';
import { productsController } from './products.controller';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateAvailabilitySchema,
  updatePriceSchema,
  updateProductSchema,
} from './products.schema';

const router = Router();

router.use(authMiddleware);

// Catálogo - qualquer utilizador autenticado pode consultar (Cliente vê só disponíveis)
router.get('/', validate({ query: listProductsQuerySchema }), productsController.list);

// Gestão do catálogo - só ADMIN
router.post('/', authorize('ADMIN'), validate({ body: createProductSchema }), productsController.create);

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productsController.update,
);

// Foto do produto (multipart, campo `image`). validate ANTES do upload: pedido inválido não grava ficheiros.
router.post(
  '/:id/image',
  authorize('ADMIN'),
  validate({ params: productIdParamSchema }),
  uploadProductImage,
  verifyUploadedFiles,
  productsController.uploadImage,
);

router.delete('/:id/image', authorize('ADMIN'), validate({ params: productIdParamSchema }), productsController.removeImage);

router.patch(
  '/:id/availability',
  authorize('ADMIN'),
  validate({ params: productIdParamSchema, body: updateAvailabilitySchema }),
  productsController.updateAvailability,
);

router.patch(
  '/:id/price',
  authorize('ADMIN'),
  validate({ params: productIdParamSchema, body: updatePriceSchema }),
  productsController.updatePrice,
);

export default router;

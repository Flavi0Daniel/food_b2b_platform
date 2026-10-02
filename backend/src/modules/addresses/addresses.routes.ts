import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { addressesController } from './addresses.controller';
import {
  addressIdParamSchema,
  createAddressSchema,
  listAddressesQuerySchema,
  updateAddressSchema,
} from './addresses.schema';

const router = Router();
router.use(authMiddleware);

// Cada utilizador gere as suas moradas; ADMIN/OPERATOR podem agir em nome de outros (userId)
router.get('/', validate({ query: listAddressesQuerySchema }), addressesController.list);
router.post('/', validate({ body: createAddressSchema }), addressesController.create);
router.patch(
  '/:id',
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  addressesController.update,
);
router.delete('/:id', validate({ params: addressIdParamSchema }), addressesController.remove);

export default router;

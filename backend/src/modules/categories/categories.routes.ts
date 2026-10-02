import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { createCategorySchema } from './categories.schema';
import { categoriesService } from './categories.service';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await categoriesService.list(), 'Categorias obtidas com sucesso');
  }),
);

router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: createCategorySchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await categoriesService.create(req.body.name), 'Categoria criada com sucesso', 201);
  }),
);

export default router;

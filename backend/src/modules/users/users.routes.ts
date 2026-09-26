import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { usersController } from './users.controller';
import {
  createInternalUserSchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './users.schema';

const router = Router();

// Todas as rotas deste módulo exigem autenticação
router.use(authMiddleware);

// Criação de contas internas (Fornecedor, Transportadora, Operador) - só ADMIN
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: createInternalUserSchema }),
  usersController.create,
);

// Listagem de utilizadores - ADMIN e OPERATOR podem consultar
router.get(
  '/',
  authorize('ADMIN', 'OPERATOR'),
  validate({ query: listUsersQuerySchema }),
  usersController.list,
);

// Bloquear/desbloquear contas - só ADMIN
router.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  usersController.updateStatus,
);

export default router;

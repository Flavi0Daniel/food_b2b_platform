import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authController } from './auth.controller';
import { loginSchema, refreshTokenSchema, registerClientSchema } from './auth.schema';

const router = Router();

// Registo público - EXCLUSIVO para Clientes
router.post('/register', validate({ body: registerClientSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', validate({ body: refreshTokenSchema }), authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;

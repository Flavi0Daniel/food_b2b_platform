import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from '../../common/middlewares/rateLimit.middleware';
import { authController } from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerClientSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema';

const router = Router();

// Registo público - EXCLUSIVO para Clientes
router.post('/register', registerLimiter, validate({ body: registerClientSchema }), authController.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', validate({ body: refreshTokenSchema }), authController.logout);

router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate({ body: updateProfileSchema }), authController.updateProfile);
router.patch(
  '/me/password',
  authMiddleware,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

// Recuperação de senha - pública, mas com rate limit (evita spam/abuso)
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

export default router;

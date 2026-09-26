import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { UserRole } from '../types';

/**
 * Restringe o acesso a uma rota a um conjunto de perfis (roles).
 * Deve ser usado DEPOIS do authMiddleware, pois depende de req.user.
 *
 *   router.post('/', authMiddleware, authorize('ADMIN'), controller.create);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('O seu perfil não tem permissão para esta ação'));
    }

    next();
  };
}

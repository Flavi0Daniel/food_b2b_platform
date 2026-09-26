import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Exige um Access Token JWT válido no cabeçalho Authorization: Bearer <token>.
 * Em caso de sucesso, popula req.user = { id, role }.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de acesso não fornecido'));
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Token de acesso inválido ou expirado'));
  }
}

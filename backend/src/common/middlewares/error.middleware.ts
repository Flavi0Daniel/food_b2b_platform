import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { env } from '../../config/env';

/**
 * Middleware global de erros. Deve ser o ÚLTIMO middleware registado em app.ts.
 * Qualquer erro passado via next(err) - incluindo os capturados por
 * asyncHandler - chega aqui.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Erros de validação Zod que escaparam ao middleware de validação
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Erros de negócio previstos (AppError e subclasses)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Erro não esperado (bug) - nunca vazar detalhes internos em produção
  // eslint-disable-next-line no-console
  console.error('💥 Erro inesperado:', err);

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(env.NODE_ENV !== 'production' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}

import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { env } from '../../config/env';

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Ficheiro demasiado grande (máximo 5 MB)',
  LIMIT_FILE_COUNT: 'Demasiados ficheiros no pedido',
  LIMIT_UNEXPECTED_FILE: 'Campo de ficheiro inesperado',
};

function bodyParserError(err: unknown): { status: number; type: string } | null {
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const { type, status } = err as { type: unknown; status?: unknown };
    if (typeof type === 'string' && type.startsWith('entity.')) {
      return { type, status: typeof status === 'number' ? status : 400 };
    }
  }
  return null;
}

/**
 * Middleware global de erros. Deve ser o ÚLTIMO middleware registado em app.ts.
 * Nunca devolve detalhes internos (stack, SQL) em produção.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: MULTER_MESSAGES[err.code] ?? 'Erro no envio do ficheiro',
    });
    return;
  }

  const parserError = bodyParserError(err);
  if (parserError) {
    res.status(parserError.status).json({
      success: false,
      message:
        parserError.type === 'entity.too.large'
          ? 'Corpo do pedido demasiado grande'
          : 'Corpo do pedido inválido',
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('💥 Erro inesperado:', err);

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(env.NODE_ENV !== 'production' && err instanceof Error ? { stack: err.stack } : {}),
  });
}

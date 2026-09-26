import { Response } from 'express';

interface SuccessPayload<T> {
  success: true;
  data: T;
  message: string;
}

/**
 * Envia uma resposta de sucesso no formato padrão da API:
 * { success: true, data: {...}, message: "..." }
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operação realizada com sucesso',
  statusCode = 200,
): Response<SuccessPayload<T>> {
  return res.status(statusCode).json({ success: true, data, message });
}

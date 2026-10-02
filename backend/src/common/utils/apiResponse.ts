import { Response } from 'express';
import { PageMeta } from './pagination';

const toCamelKey = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());

/**
 * Converte recursivamente as chaves snake_case (colunas MySQL) para camelCase,
 * para que a API fale sempre camelCase, tanto nos pedidos como nas respostas.
 */
export function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (Object.prototype.toString.call(value) === '[object Object]') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        toCamelKey(key),
        camelizeKeys(val),
      ]),
    );
  }
  return value;
}

/** Resposta de sucesso padrão: { success: true, data, message } */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operação realizada com sucesso',
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, data: camelizeKeys(data), message });
}

/** Resposta paginada: { success: true, data: [...], meta: { page, pageSize, total, totalPages } } */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: PageMeta,
  message = 'Operação realizada com sucesso',
): Response {
  return res.status(200).json({ success: true, data: camelizeKeys(items), meta, message });
}

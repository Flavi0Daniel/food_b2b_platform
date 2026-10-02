import { randomUUID } from 'node:crypto';

/** Ex: formatDocumentNumber('ORD', 123) -> ORD-2026-000123 */
export function formatDocumentNumber(prefix: string, id: number, date = new Date()): string {
  return `${prefix}-${date.getFullYear()}-${String(id).padStart(6, '0')}`;
}

/** Valor temporário único (<= 20 chars) usado entre o INSERT e a atribuição do número definitivo. */
export function temporaryDocumentNumber(): string {
  return `TMP-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

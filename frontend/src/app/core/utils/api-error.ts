import { HttpErrorResponse } from '@angular/common/http';

/**
 * Junta a mensagem da API com o detalhe por campo (erros de validação Zod), quando existir.
 * Ex: "Dados de entrada inválidos (phone: String must contain at least 9 character(s))".
 */
export function apiErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const body = err.error as { message?: string; errors?: unknown } | null | undefined;
  const base = body?.message ?? fallback;
  const errors = body?.errors;

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const parts = Object.entries(errors as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([field, value]) => `${field}: ${(value as string[]).join(', ')}`);
    if (parts.length) return `${base} (${parts.join(' · ')})`;
  }
  return base;
}

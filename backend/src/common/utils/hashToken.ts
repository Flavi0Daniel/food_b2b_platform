import { createHash } from 'node:crypto';

/**
 * Gera um hash SHA-256 determinístico do refresh token para guardar na BD.
 * Ao contrário do bcrypt (salt aleatório), este hash permite localizar o
 * token por igualdade direta numa query (WHERE token_hash = ?).
 * Nunca guardamos o refresh token em texto simples na base de dados.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

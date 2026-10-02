import { ResultSetHeader } from 'mysql2/promise';
import { Db, pool } from '../../config/database';

interface Executor {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
}

/**
 * Helpers finos sobre mysql2. TODAS as queries usam placeholders (?) com valores
 * separados do SQL - nunca concatenar input do utilizador no texto SQL.
 */
export async function query<T>(sql: string, params: unknown[] = [], db: Db = pool): Promise<T[]> {
  const [rows] = await (db as unknown as Executor).query(sql, params);
  return rows as unknown as T[];
}

export async function queryOne<T>(
  sql: string,
  params: unknown[] = [],
  db: Db = pool,
): Promise<T | null> {
  const rows = await query<T>(sql, params, db);
  return rows[0] ?? null;
}

export async function exec(
  sql: string,
  params: unknown[] = [],
  db: Db = pool,
): Promise<ResultSetHeader> {
  const [result] = await (db as unknown as Executor).query(sql, params);
  return result as unknown as ResultSetHeader;
}

function mysqlCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

export const isDuplicateEntry = (err: unknown): boolean => mysqlCode(err) === 'ER_DUP_ENTRY';
export const isReferencedRow = (err: unknown): boolean => mysqlCode(err) === 'ER_ROW_IS_REFERENCED_2';

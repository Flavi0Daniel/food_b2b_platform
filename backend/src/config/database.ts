import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { env } from './env';

/** Qualquer coisa capaz de executar queries: o pool ou uma ligação dentro de uma transação. */
export type Db = Pool | PoolConnection;

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10_000,
  timezone: 'Z',
  dateStrings: true,
  // DECIMAL -> number, TINYINT(1) -> boolean e DATETIME -> ISO 8601 (UTC), para o JSON ter tipos corretos.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeCast: (field: any, next: () => unknown) => {
    if (field.type === 'NEWDECIMAL' || field.type === 'DECIMAL') {
      const value = field.string() as string | null;
      return value === null ? null : Number(value);
    }
    if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
      const value = field.string() as string | null;
      return value === null ? null : `${value.replace(' ', 'T')}Z`;
    }
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string() as string | null;
      return value === null ? null : value === '1';
    }
    return next();
  },
});

// Toda a sessão MySQL em UTC: NOW()/CURRENT_TIMESTAMP ficam coerentes com as datas enviadas pelo Node.
(pool as unknown as {
  pool: { on: (event: string, cb: (conn: { query: (sql: string, cb: () => void) => void }) => void) => void };
}).pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'", () => undefined));

/**
 * Executa `fn` dentro de uma transação. Faz commit se `fn` terminar,
 * rollback (e re-lança o erro) se falhar.
 */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Verifica a ligação à base de dados no arranque da aplicação. */
export async function checkDatabaseConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    // eslint-disable-next-line no-console
    console.log(`✅ Ligado à base de dados MySQL (${env.DB_NAME})`);
  } finally {
    connection.release();
  }
}

import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Verifica a ligação à base de dados no arranque da aplicação.
 * Chamado uma vez em src/server.ts.
 */
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

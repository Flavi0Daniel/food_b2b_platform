import { pool } from '../../config/database';
import { UserRecord } from '../../common/types';
import { RegisterClientDto } from './auth.schema';

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const users = rows as UserRecord[];
    return users[0] ?? null;
  },

  async findUserById(id: number): Promise<UserRecord | null> {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const users = rows as UserRecord[];
    return users[0] ?? null;
  },

  async createClient(dto: RegisterClientDto, passwordHash: string): Promise<UserRecord> {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role, status, company_name, tax_id)
       VALUES (?, ?, ?, ?, 'CLIENT', 'ACTIVE', ?, ?)`,
      [dto.name, dto.email, passwordHash, dto.phone ?? null, dto.companyName ?? null, dto.taxId ?? null],
    );
    const insertId = (result as { insertId: number }).insertId;
    const created = await this.findUserById(insertId);
    if (!created) throw new Error('Falha ao carregar utilizador recém-criado');
    return created;
  },

  async storeRefreshToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt],
    );
  },

  async findValidRefreshToken(tokenHash: string): Promise<{ id: number; user_id: number } | null> {
    const [rows] = await pool.query(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1`,
      [tokenHash],
    );
    const tokens = rows as { id: number; user_id: number }[];
    return tokens[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?`, [tokenHash]);
  },
};

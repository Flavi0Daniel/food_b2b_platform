import { pool } from '../../config/database';
import { exec, queryOne } from '../../common/utils/db';
import { UserRecord } from '../../common/types';
import { RegisterClientDto, UpdateProfileDto } from './auth.schema';

export interface PasswordResetTokenRow {
  id: number;
  user_id: number;
  expires_at: string;
  used: boolean;
}

// Mapa fixo DTO -> coluna: os nomes de colunas nunca vêm do input do utilizador.
const PROFILE_COLUMNS = {
  name: 'name',
  phone: 'phone',
  companyName: 'company_name',
  taxId: 'tax_id',
} as const;

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

  /** Termina todas as sessões do utilizador (usado após troca/reset de senha, por segurança). */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await exec('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ? AND revoked = FALSE', [userId]);
  },

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    (Object.keys(PROFILE_COLUMNS) as (keyof typeof PROFILE_COLUMNS)[]).forEach((key) => {
      if (dto[key] !== undefined) {
        sets.push(`${PROFILE_COLUMNS[key]} = ?`);
        params.push(dto[key]);
      }
    });
    if (!sets.length) return;
    await exec(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, userId]);
  },

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await exec('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  },

  async createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await exec('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [
      userId,
      tokenHash,
      expiresAt,
    ]);
  },

  findValidPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRow | null> {
    return queryOne<PasswordResetTokenRow>(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens
       WHERE token_hash = ? AND used = FALSE AND expires_at > NOW() LIMIT 1`,
      [tokenHash],
    );
  },

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await exec('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [id]);
  },
};

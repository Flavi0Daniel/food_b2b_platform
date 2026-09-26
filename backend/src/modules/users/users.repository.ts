import { pool } from '../../config/database';
import { UserRecord } from '../../common/types';
import { CreateInternalUserDto, ListUsersQuery, UpdateUserStatusDto } from './users.schema';

export const usersRepository = {
  async create(dto: CreateInternalUserDto, passwordHash: string): Promise<UserRecord> {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role, status, company_name, tax_id)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [dto.name, dto.email, passwordHash, dto.phone ?? null, dto.role, dto.companyName ?? null, dto.taxId ?? null],
    );
    const insertId = (result as { insertId: number }).insertId;
    const created = await this.findById(insertId);
    if (!created) throw new Error('Falha ao carregar utilizador recém-criado');
    return created;
  },

  async findById(id: number): Promise<UserRecord | null> {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const users = rows as UserRecord[];
    return users[0] ?? null;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const users = rows as UserRecord[];
    return users[0] ?? null;
  },

  async list(filters: ListUsersQuery): Promise<UserRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.role) {
      conditions.push('role = ?');
      params.push(filters.role);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC`,
      params,
    );
    return rows as UserRecord[];
  },

  async updateStatus(id: number, dto: UpdateUserStatusDto): Promise<void> {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [dto.status, id]);
  },
};

import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';

export interface AddressRecord {
  id: number;
  user_id: number;
  label: string | null;
  street: string;
  city: string;
  municipality: string | null;
  reference_point: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Mapa fixo DTO -> coluna: os nomes de colunas nunca vêm do input do utilizador.
const UPDATABLE_COLUMNS = {
  label: 'label',
  street: 'street',
  city: 'city',
  municipality: 'municipality',
  referencePoint: 'reference_point',
  latitude: 'latitude',
  longitude: 'longitude',
} as const;

export const addressesRepository = {
  findById: (id: number, db?: Db) => queryOne<AddressRecord>('SELECT * FROM addresses WHERE id = ?', [id], db),

  listByUser: (userId: number) =>
    query<AddressRecord>('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC', [userId]),

  async countByUser(userId: number, db: Db): Promise<number> {
    const row = await queryOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM addresses WHERE user_id = ? FOR UPDATE',
      [userId],
      db,
    );
    return row?.total ?? 0;
  },

  async clearDefault(userId: number, db: Db): Promise<void> {
    await exec('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId], db);
  },

  async insert(
    db: Db,
    userId: number,
    data: {
      label?: string;
      street: string;
      city: string;
      municipality?: string;
      referencePoint?: string;
      latitude?: number;
      longitude?: number;
    },
    isDefault: boolean,
  ): Promise<number> {
    const result = await exec(
      `INSERT INTO addresses (user_id, label, street, city, municipality, reference_point, latitude, longitude, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.label ?? null,
        data.street,
        data.city,
        data.municipality ?? null,
        data.referencePoint ?? null,
        data.latitude ?? null,
        data.longitude ?? null,
        isDefault,
      ],
      db,
    );
    return result.insertId;
  },

  async update(db: Db, id: number, data: Partial<Record<keyof typeof UPDATABLE_COLUMNS, unknown>>, isDefault?: boolean): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    (Object.keys(UPDATABLE_COLUMNS) as (keyof typeof UPDATABLE_COLUMNS)[]).forEach((key) => {
      if (data[key] !== undefined) {
        sets.push(`${UPDATABLE_COLUMNS[key]} = ?`);
        params.push(data[key]);
      }
    });
    if (isDefault !== undefined) {
      sets.push('is_default = ?');
      params.push(isDefault);
    }
    if (!sets.length) return;
    await exec(`UPDATE addresses SET ${sets.join(', ')} WHERE id = ?`, [...params, id], db);
  },

  async delete(db: Db, id: number): Promise<void> {
    await exec('DELETE FROM addresses WHERE id = ?', [id], db);
  },

  async promoteOldest(db: Db, userId: number): Promise<void> {
    await exec(
      'UPDATE addresses SET is_default = TRUE WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId],
      db,
    );
  },
};

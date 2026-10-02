import { Db } from '../../config/database';
import { exec, query, queryOne } from '../../common/utils/db';
import { wrapEmailHtml } from '../../common/utils/emailTemplate';

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string | null;
  related_order_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface NewNotification {
  title: string;
  message: string;
  type: string;
  orderId?: number | null;
}

export const notificationsRepository = {
  /** Notifica um utilizador. Passar `conn` para participar numa transação. */
  async create(db: Db, userId: number, n: NewNotification): Promise<void> {
    await exec(
      'INSERT INTO notifications (user_id, title, message, type, related_order_id) VALUES (?, ?, ?, ?, ?)',
      [userId, n.title, n.message, n.type, n.orderId ?? null],
      db,
    );
    // Mesma transação/conexão (db): se a operação de negócio for revertida, o email também é.
    await exec(
      `INSERT INTO email_outbox (to_email, to_name, subject, html_body)
       SELECT email, name, ?, ? FROM users WHERE id = ?`,
      [n.title, wrapEmailHtml(n.title, n.message), userId],
      db,
    );
  },

  /** Notifica todos os utilizadores internos ativos (ADMIN e OPERATOR). */
  async notifyStaff(db: Db, n: NewNotification): Promise<void> {
    await exec(
      `INSERT INTO notifications (user_id, title, message, type, related_order_id)
       SELECT id, ?, ?, ?, ? FROM users WHERE role IN ('ADMIN', 'OPERATOR') AND status = 'ACTIVE'`,
      [n.title, n.message, n.type, n.orderId ?? null],
      db,
    );
    await exec(
      `INSERT INTO email_outbox (to_email, to_name, subject, html_body)
       SELECT email, name, ?, ? FROM users WHERE role IN ('ADMIN', 'OPERATOR') AND status = 'ACTIVE'`,
      [n.title, wrapEmailHtml(n.title, n.message)],
      db,
    );
  },

  list(userId: number, unreadOnly: boolean, limit: number, offset: number): Promise<NotificationRow[]> {
    return query<NotificationRow>(
      `SELECT * FROM notifications WHERE user_id = ? ${unreadOnly ? 'AND is_read = FALSE' : ''}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
  },

  async count(userId: number, unreadOnly: boolean): Promise<number> {
    const row = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? ${unreadOnly ? 'AND is_read = FALSE' : ''}`,
      [userId],
    );
    return row?.total ?? 0;
  },

  async markRead(userId: number, id: number): Promise<boolean> {
    const result = await exec('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async markAllRead(userId: number): Promise<void> {
    await exec('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [userId]);
  },
};

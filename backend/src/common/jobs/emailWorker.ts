import { exec, query } from '../utils/db';
import { isMailerConfigured, sendMail } from '../utils/mailer';

interface OutboxRow {
  id: number;
  to_email: string;
  to_name: string | null;
  subject: string;
  html_body: string;
  attempts: number;
}

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 15_000;

/**
 * Processa um lote da fila de emails (tabela `email_outbox`). Os emails são colocados em fila
 * na MESMA transação da operação de negócio (ver notifications.repository.ts), por isso nunca são
 * enviados para algo que depois acabou por ser revertido (rollback) — só o que foi de facto gravado.
 */
async function processBatch(): Promise<void> {
  const rows = await query<OutboxRow>(
    `SELECT id, to_email, to_name, subject, html_body, attempts FROM email_outbox
     WHERE status = 'PENDING' AND attempts < ? ORDER BY id ASC LIMIT ?`,
    [MAX_ATTEMPTS, BATCH_SIZE],
  );

  for (const row of rows) {
    try {
      await sendMail({ email: row.to_email, name: row.to_name }, row.subject, row.html_body);
      await exec("UPDATE email_outbox SET status = 'SENT', sent_at = NOW() WHERE id = ?", [row.id]);
    } catch (err) {
      const attempts = row.attempts + 1;
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      await exec(
        `UPDATE email_outbox
         SET attempts = ?, last_error = ?, status = IF(? >= ?, 'FAILED', 'PENDING')
         WHERE id = ?`,
        [attempts, message, attempts, MAX_ATTEMPTS, row.id],
      );
    }
  }
}

/** Arranca o worker de emails (arranque imediato + sondagem periódica). */
export function startEmailWorker(): void {
  if (!isMailerConfigured()) {
    // eslint-disable-next-line no-console
    console.log('ℹ️  SMTP não configurado — os emails ficam em fila em email_outbox até serem enviados.');
    return;
  }

  void processBatch();
  setInterval(() => void processBatch(), POLL_INTERVAL_MS).unref();
}

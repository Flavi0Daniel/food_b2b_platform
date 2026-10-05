import { exec } from '../utils/db';

async function purge(): Promise<void> {
  try {
    await exec('DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL 48 HOUR');
    await exec(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (revoked = TRUE AND created_at < NOW() - INTERVAL 1 DAY)',
    );
    await exec(
      "DELETE FROM email_outbox WHERE status IN ('SENT', 'FAILED') AND created_at < NOW() - INTERVAL 30 DAY",
    );
    await exec(
      'DELETE FROM password_reset_tokens WHERE used = TRUE OR expires_at < NOW() - INTERVAL 1 DAY',
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Falha na limpeza periódica:', err);
  }
}

/** Limpa chaves de idempotência antigas e refresh tokens expirados/revogados (arranque + de hora a hora). */
export function startMaintenanceJobs(): void {
  void purge();
  setInterval(() => void purge(), 60 * 60 * 1000).unref();
}

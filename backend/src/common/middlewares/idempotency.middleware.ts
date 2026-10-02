import { createHash } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { exec, isDuplicateEntry, queryOne } from '../utils/db';
import { collectUploadedFiles, removeUploadedFiles } from './upload.middleware';

interface StoredKey {
  id: number;
  request_hash: string;
  response_status: number | null;
  response_body: unknown;
  stale: number;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
/** Se um pedido ficou "em processamento" há mais tempo do que isto, assume-se que o servidor caiu a meio. */
const STALE_AFTER_SECONDS = 120;

/**
 * Idempotência para operações críticas (criar encomenda, submeter pagamento, aprovar).
 * Exige o cabeçalho `X-Idempotency-Key` (8-100 chars: letras, números, _ e -).
 *
 *  - 1.º pedido com a chave: executa normalmente e guarda a resposta de sucesso (2xx).
 *  - Repetição com a mesma chave: devolve a resposta guardada, sem reexecutar.
 *  - Repetição enquanto o 1.º ainda corre: 409.
 *  - Mesma chave com corpo diferente: 422.
 *  - Se o 1.º pedido falhar (não 2xx), a chave é libertada para permitir nova tentativa.
 *
 * Colocar DEPOIS de auth/validate (precisa de req.user e do body já validado).
 */
export async function idempotent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.header('X-Idempotency-Key');
    if (!key || !KEY_PATTERN.test(key)) {
      throw AppError.badRequest(
        'Cabeçalho X-Idempotency-Key obrigatório (8-100 caracteres: letras, números, _ ou -)',
      );
    }

    const userId = req.user!.id;
    const endpoint = `${req.method} ${req.originalUrl.split('?')[0]}`.slice(0, 100);
    const requestHash = createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex');

    let recordId: number | null = null;

    for (let attempt = 0; attempt < 2 && recordId === null; attempt++) {
      try {
        const result = await exec(
          'INSERT INTO idempotency_keys (user_id, endpoint, idempotency_key, request_hash) VALUES (?, ?, ?, ?)',
          [userId, endpoint, key, requestHash],
        );
        recordId = result.insertId;
      } catch (err) {
        if (!isDuplicateEntry(err)) throw err;

        const existing = await queryOne<StoredKey>(
          `SELECT id, request_hash, response_status, response_body,
                  (TIMESTAMPDIFF(SECOND, created_at, NOW()) > ?) AS stale
           FROM idempotency_keys WHERE user_id = ? AND endpoint = ? AND idempotency_key = ?`,
          [STALE_AFTER_SECONDS, userId, endpoint, key],
        );
        if (!existing) continue; // foi libertada entretanto: tenta outra vez

        await removeUploadedFiles(collectUploadedFiles(req)); // o pedido repetido não vai usar os ficheiros

        if (existing.request_hash !== requestHash) {
          throw new AppError('Esta X-Idempotency-Key já foi usada com um pedido diferente', 422);
        }
        if (existing.response_status !== null) {
          res.setHeader('Idempotent-Replayed', 'true');
          res.status(existing.response_status).json(existing.response_body);
          return;
        }
        if (existing.stale) {
          await exec('DELETE FROM idempotency_keys WHERE id = ?', [existing.id]);
          continue; // tenta registar de novo
        }
        throw AppError.conflict('Um pedido idêntico já está a ser processado');
      }
    }

    if (recordId === null) throw AppError.conflict('Não foi possível registar o pedido. Tente novamente.');

    const id = recordId;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      const persist = ok
        ? exec('UPDATE idempotency_keys SET response_status = ?, response_body = ? WHERE id = ?', [
            res.statusCode,
            JSON.stringify(body),
            id,
          ])
        : exec('DELETE FROM idempotency_keys WHERE id = ?', [id]);
      persist.catch((e) => console.error('Falha ao atualizar idempotency_keys:', e)); // eslint-disable-line no-console
      return originalJson(body);
    }) as unknown as Response['json'];

    next();
  } catch (err) {
    await removeUploadedFiles(collectUploadedFiles(req));
    next(err);
  }
}

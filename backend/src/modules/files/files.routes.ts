import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/errors/AppError';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { uploadRoot } from '../../common/middlewares/upload.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { isStaff, JwtUserPayload } from '../../common/types';
import { queryOne } from '../../common/utils/db';

const paramsSchema = z
  .object({
    folder: z.enum(['payments', 'pod', 'avatars']),
    // Só nomes gerados pelo servidor (uuid + extensão): impede path traversal por construção
    filename: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/),
  })
  .strict();

type FileFolder = 'payments' | 'pod' | 'avatars';

/**
 * Os ficheiros são privados: só quem tem relação com a encomenda abre os comprovativos e provas de entrega.
 * Avatares/logos: só o próprio dono e a equipa (ADMIN/OPERATOR). Nunca outro perfil: um Cliente jamais
 * pode ver o logo de um Fornecedor (intermediação cega) e vice-versa.
 */
async function canAccess(actor: JwtUserPayload, folder: FileFolder, stored: string): Promise<boolean> {
  if (folder === 'avatars') {
    const owner = await queryOne<{ id: number }>('SELECT id FROM users WHERE avatar_url = ?', [stored]);
    return !!owner && (isStaff(actor.role) || owner.id === actor.id);
  }

  if (folder === 'payments') {
    const row = await queryOne<{ client_id: number }>(
      `SELECT o.client_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.proof_url = ?`,
      [stored],
    );
    return !!row && (isStaff(actor.role) || row.client_id === actor.id);
  }

  const row = await queryOne<{ carrier_id: number; client_id: number }>(
    `SELECT s.carrier_id, o.client_id FROM shipments s JOIN orders o ON o.id = s.order_id
     WHERE s.pod_photo_url = ? OR s.pod_signature_url = ?`,
    [stored, stored],
  );
  return !!row && (isStaff(actor.role) || row.carrier_id === actor.id || row.client_id === actor.id);
}

const router = Router();

// GET /api/files/payments/<uuid>.jpg  |  GET /api/files/pod/<uuid>.png  (exige Authorization: Bearer)
router.get(
  '/:folder/:filename',
  authMiddleware,
  validate({ params: paramsSchema }),
  (req: Request, res: Response, next: NextFunction) => {
    const { folder, filename } = req.params as { folder: FileFolder; filename: string };

    canAccess(req.user!, folder, `${folder}/${filename}`)
      .then((allowed) => {
        if (!allowed) throw AppError.notFound('Ficheiro não encontrado'); // 404: não revela que existe
        res.sendFile(
          filename,
          {
            root: uploadRoot(folder),
            dotfiles: 'deny',
            headers: { 'Cache-Control': 'private, max-age=300', 'Content-Disposition': 'inline' },
          },
          (err) => {
            if (err && !res.headersSent) next(AppError.notFound('Ficheiro não encontrado'));
          },
        );
      })
      .catch(next);
  },
);

export default router;

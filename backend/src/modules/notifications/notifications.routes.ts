import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/errors/AppError';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { sendPaginated, sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { buildMeta, offsetOf, paginationShape } from '../../common/utils/pagination';
import { notificationsRepository } from './notifications.repository';

const listQuery = z
  .object({
    ...paginationShape,
    unreadOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict();
const idParam = z.object({ id: z.coerce.number().int().positive() }).strict();

const router = Router();
router.use(authMiddleware);

// Notificações do próprio utilizador autenticado
router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, unreadOnly } = req.query as unknown as {
      page: number;
      pageSize: number;
      unreadOnly: boolean;
    };
    const userId = req.user!.id;
    const [items, total] = await Promise.all([
      notificationsRepository.list(userId, unreadOnly, pageSize, offsetOf(page, pageSize)),
      notificationsRepository.count(userId, unreadOnly),
    ]);
    sendPaginated(res, items, buildMeta(page, pageSize, total), 'Notificações obtidas com sucesso');
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const unread = await notificationsRepository.count(req.user!.id, true);
    sendSuccess(res, { unread }, 'Contagem obtida com sucesso');
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationsRepository.markAllRead(req.user!.id);
    sendSuccess(res, null, 'Notificações marcadas como lidas');
  }),
);

router.patch(
  '/:id/read',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const updated = await notificationsRepository.markRead(req.user!.id, Number(req.params.id));
    if (!updated) throw AppError.notFound('Notificação não encontrada');
    sendSuccess(res, null, 'Notificação marcada como lida');
  }),
);

export default router;

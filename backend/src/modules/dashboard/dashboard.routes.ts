import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/rbac.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { dashboardQuerySchema } from './dashboard.schema';
import { dashboardService } from './dashboard.service';

const router = Router();
router.use(authMiddleware);

// Dashboard (Módulo 5): vendas, custos operacionais e margens líquidas. Por omissão, últimos 30 dias.
router.get(
  '/',
  authorize('ADMIN', 'OPERATOR'),
  validate({ query: dashboardQuerySchema }),
  asyncHandler(async (req, res) => {
    const overview = await dashboardService.getOverview(req.query as never);
    sendSuccess(res, overview, 'Resumo do dashboard obtido com sucesso');
  }),
);

export default router;

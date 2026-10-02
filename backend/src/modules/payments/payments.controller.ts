import { Request, Response } from 'express';
import { collectUploadedFiles, removeUploadedFiles } from '../../common/middlewares/upload.middleware';
import { sendPaginated, sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { paymentsService } from './payments.service';

export const paymentsController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const uploaded = collectUploadedFiles(req);
    try {
      const payment = await paymentsService.submit(req.user!, req.body, req.file);
      sendSuccess(res, payment, 'Comprovativo submetido. Aguarde a validação do pagamento.', 201);
    } catch (err) {
      await removeUploadedFiles(uploaded); // não deixar ficheiros órfãos se a operação falhar
      throw err;
    }
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await paymentsService.list(req.query as never);
    sendPaginated(res, items, meta, 'Pagamentos obtidos com sucesso');
  }),

  validate: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await paymentsService.validate(req.user!, Number(req.params.id)), 'Pagamento validado');
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.reject(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, payment, 'Pagamento rejeitado');
  }),
};

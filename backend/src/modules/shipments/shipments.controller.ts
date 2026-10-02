import { Request, Response } from 'express';
import { collectUploadedFiles, removeUploadedFiles } from '../../common/middlewares/upload.middleware';
import { sendPaginated, sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { shipmentsService } from './shipments.service';

export const shipmentsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await shipmentsService.list(req.user!, req.query as never);
    sendPaginated(res, items, meta, 'Guias de transporte obtidas com sucesso');
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await shipmentsService.get(req.user!, Number(req.params.id)), 'Guia obtida com sucesso');
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const shipment = await shipmentsService.updateStatus(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, shipment, 'Estado da guia atualizado');
  }),

  deliver: asyncHandler(async (req: Request, res: Response) => {
    const uploaded = collectUploadedFiles(req);
    try {
      const files = (req.files ?? {}) as { photo?: Express.Multer.File[]; signature?: Express.Multer.File[] };
      const shipment = await shipmentsService.deliver(req.user!, Number(req.params.id), files);
      sendSuccess(res, shipment, 'Entrega registada com sucesso');
    } catch (err) {
      await removeUploadedFiles(uploaded); // não deixar ficheiros órfãos se a operação falhar
      throw err;
    }
  }),

  reassign: asyncHandler(async (req: Request, res: Response) => {
    const shipment = await shipmentsService.reassign(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, shipment, 'Transportadora atualizada');
  }),
};

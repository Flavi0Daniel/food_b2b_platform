import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { purchaseOrdersService } from './purchase-orders.service';

export const purchaseOrdersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await purchaseOrdersService.list(req.user!, req.query as never);
    sendPaginated(res, items, meta, 'Ordens de compra obtidas com sucesso');
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await purchaseOrdersService.get(req.user!, Number(req.params.id)), 'Ordem de compra obtida');
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const po = await purchaseOrdersService.updateStatus(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, po, 'Estado da ordem de compra atualizado');
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const po = await purchaseOrdersService.cancel(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, po, 'Ordem de compra cancelada');
  }),

  reassign: asyncHandler(async (req: Request, res: Response) => {
    const po = await purchaseOrdersService.reassign(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, po, 'Ordem de compra reatribuída a outro fornecedor');
  }),
};

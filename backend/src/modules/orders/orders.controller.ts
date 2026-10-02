import { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ordersService } from './orders.service';

export const ordersController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.create(req.user!, req.body);
    sendSuccess(res, order, 'Encomenda criada com sucesso', 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await ordersService.list(req.user!, req.query as never);
    sendPaginated(res, items, meta, 'Encomendas obtidas com sucesso');
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await ordersService.getDetail(req.user!, Number(req.params.id)), 'Encomenda obtida com sucesso');
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.cancel(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, order, 'Encomenda cancelada');
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.approve(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, order, 'Encomenda aprovada: ordens de compra e guias de transporte criadas');
  }),
};

import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { addressesService } from './addresses.service';

export const addressesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query as { userId?: number | undefined };
    sendSuccess(res, await addressesService.list(req.user!, userId), 'Moradas obtidas com sucesso');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await addressesService.create(req.user!, req.body), 'Morada criada com sucesso', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const address = await addressesService.update(req.user!, Number(req.params.id), req.body);
    sendSuccess(res, address, 'Morada atualizada com sucesso');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await addressesService.remove(req.user!, Number(req.params.id));
    sendSuccess(res, null, 'Morada removida com sucesso');
  }),
};

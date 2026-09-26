import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { usersService } from './users.service';

export const usersController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.createInternalUser(req.body);
    sendSuccess(res, user, 'Utilizador criado com sucesso', 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const users = await usersService.listUsers(req.query as never);
    sendSuccess(res, users, 'Utilizadores listados com sucesso');
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = await usersService.updateStatus(id, req.body);
    sendSuccess(res, user, 'Estado do utilizador atualizado com sucesso');
  }),
};

import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { AppError } from '../../common/errors/AppError';
import { authService } from './auth.service';
import { authRepository } from './auth.repository';
import { toSafeUser } from '../../common/types';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.registerClient(req.body);
    sendSuccess(res, result, 'Conta criada com sucesso', 201);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Login efetuado com sucesso');
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, result, 'Token renovado com sucesso');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, null, 'Sessão terminada com sucesso');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    // req.user é garantido pelo authMiddleware
    const user = await authRepository.findUserById(req.user!.id);
    if (!user) throw AppError.notFound('Utilizador não encontrado');
    sendSuccess(res, toSafeUser(user), 'Perfil obtido com sucesso');
  }),
};

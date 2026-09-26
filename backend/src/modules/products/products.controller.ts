import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { productsService } from './products.service';

export const productsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.createProduct(req.body);
    sendSuccess(res, product, 'Produto criado com sucesso', 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    // Clientes só devem ver o catálogo disponível; Admin/Operador veem tudo
    const forceAvailableOnly = req.user?.role === 'CLIENT';
    const query = req.query as never as { categoryId?: number; onlyAvailable?: boolean };
    const products = await productsService.listCatalog({
      ...query,
      onlyAvailable: forceAvailableOnly ? true : query.onlyAvailable,
    });
    sendSuccess(res, products, 'Catálogo obtido com sucesso');
  }),

  updateAvailability: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const product = await productsService.setAvailability(id, req.body.isAvailable);
    sendSuccess(res, product, 'Disponibilidade do produto atualizada');
  }),
};

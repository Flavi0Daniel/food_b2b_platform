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
    const products = await productsService.listCatalog(req.query as never, req.user!.role);
    sendSuccess(res, products, 'Catálogo obtido com sucesso');
  }),

  updateAvailability: asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.setAvailability(Number(req.params.id), req.body.isAvailable);
    sendSuccess(res, product, 'Disponibilidade do produto atualizada');
  }),

  updatePrice: asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.setPrice(Number(req.params.id), req.body.sellPrice);
    sendSuccess(res, product, 'Preço de venda atualizado');
  }),
};

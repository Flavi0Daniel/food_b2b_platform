import { Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError';
import { removeUploadedFiles } from '../../common/middlewares/upload.middleware';
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

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.updateProduct(Number(req.params.id), req.body);
    sendSuccess(res, product, 'Produto atualizado com sucesso');
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw AppError.badRequest('Envie uma imagem no campo "image"');

    try {
      const product = await productsService.setImage(Number(req.params.id), `products/${file.filename}`);
      sendSuccess(res, product, 'Foto do produto atualizada');
    } catch (err) {
      await removeUploadedFiles([file]); // produto inexistente (ou falha): não deixa o ficheiro órfão em disco
      throw err;
    }
  }),

  removeImage: asyncHandler(async (req: Request, res: Response) => {
    const product = await productsService.removeImage(Number(req.params.id));
    sendSuccess(res, product, 'Foto do produto removida');
  }),

  changeUnit: asyncHandler(async (req: Request, res: Response) => {
    const result = await productsService.changeUnit(Number(req.params.id), req.body.baseUnit);
    sendSuccess(res, result, 'Unidade do produto alterada');
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

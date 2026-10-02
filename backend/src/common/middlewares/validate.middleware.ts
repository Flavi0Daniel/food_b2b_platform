import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { collectUploadedFiles, removeUploadedFiles } from './upload.middleware';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Valida req.body / req.params / req.query com Zod. Usar sempre schemas `.strict()`:
 * propriedades não declaradas são rejeitadas (whitelist).
 * Substitui os valores pelos dados já validados e transformados (coerções, defaults).
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Os dados validados (com coerções para number/boolean) raramente têm a forma exata de
      // ParsedQs/ParamsDictionary (que só admitem string), por isso o cast passa sempre por `unknown`.
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.params) req.params = schemas.params.parse(req.params) as unknown as typeof req.params;
      if (schemas.query) req.query = schemas.query.parse(req.query) as unknown as typeof req.query;
      next();
    } catch (err) {
      void removeUploadedFiles(collectUploadedFiles(req)); // pedido inválido: não deixar ficheiros órfãos
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
}

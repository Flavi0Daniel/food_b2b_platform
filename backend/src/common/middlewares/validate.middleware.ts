import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';

interface ValidationSchemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

/**
 * Middleware de validação de DTOs. Uso nas rotas:
 *
 *   router.post('/', validate({ body: createProductSchema }), controller.create);
 *
 * Substitui req.body/params/query pelos dados já validados e transformados
 * (ex: coerções de tipo do Zod), garantindo type-safety no controller.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
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

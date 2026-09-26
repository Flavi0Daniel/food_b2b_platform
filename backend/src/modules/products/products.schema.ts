import { z } from 'zod';

const baseUnitEnum = z.enum(['KG', 'CAIXA', 'BALDE', 'SACO', 'UNIDADE']);

export const createProductSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  name: z.string().min(2),
  description: z.string().optional(),
  baseUnit: baseUnitEnum,
  imageUrl: z.string().url().optional(),
  sellPrice: z.coerce.number().positive().optional(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type UpdateAvailabilityDto = z.infer<typeof updateAvailabilitySchema>;

// z.coerce.boolean() trataria a string "false" como true (Boolean("false") === true),
// por isso interpretamos explicitamente os valores de query string "true"/"false".
const queryBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

export const listProductsQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  onlyAvailable: queryBoolean,
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

import { z } from 'zod';

const baseUnitEnum = z.enum(['KG', 'CAIXA', 'BALDE', 'SACO', 'UNIDADE']);
const money = z.number().positive().max(99_999_999).multipleOf(0.01);

export const createProductSchema = z
  .object({
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(2000).optional(),
    baseUnit: baseUnitEnum,
    imageUrl: z.string().url().max(500).optional(),
    sellPrice: money.optional(),
  })
  .strict();
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateAvailabilitySchema = z.object({ isAvailable: z.boolean() }).strict();
export type UpdateAvailabilityDto = z.infer<typeof updateAvailabilitySchema>;

export const updatePriceSchema = z.object({ sellPrice: money }).strict();

// z.coerce.boolean() trataria a string "false" como true (Boolean("false") === true),
// por isso interpretamos explicitamente os valores de query string "true"/"false".
const queryBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

export const listProductsQuerySchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    onlyAvailable: queryBoolean,
  })
  .strict();
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

import { z } from 'zod';

export const upsertSupplierProductSchema = z
  .object({
    costPrice: z.number().positive().max(99_999_999).multipleOf(0.01),
    isActive: z.boolean().default(true),
  })
  .strict();
export type UpsertSupplierProductDto = z.infer<typeof upsertSupplierProductSchema>;

export const productParamSchema = z.object({ productId: z.coerce.number().int().positive() }).strict();

export const supplierProductParamSchema = z
  .object({
    supplierId: z.coerce.number().int().positive(),
    productId: z.coerce.number().int().positive(),
  })
  .strict();

export const listSupplierProductsQuerySchema = z
  .object({
    supplierId: z.coerce.number().int().positive().optional(),
    productId: z.coerce.number().int().positive().optional(),
  })
  .strict();
export type ListSupplierProductsQuery = z.infer<typeof listSupplierProductsQuerySchema>;

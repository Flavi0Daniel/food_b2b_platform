import { z } from 'zod';

export const createCategorySchema = z.object({ name: z.string().trim().min(2).max(100) }).strict();
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({ name: z.string().trim().min(2).max(100) }).strict();
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const categoryIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

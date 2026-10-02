import { z } from 'zod';

export const createCategorySchema = z.object({ name: z.string().trim().min(2).max(100) }).strict();
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

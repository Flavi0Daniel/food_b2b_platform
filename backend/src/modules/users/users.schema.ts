import { z } from 'zod';

// Registo privado - criado exclusivamente pelo Admin
export const createInternalUserSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().toLowerCase().email().max(150),
    password: z.string().min(8).max(72),
    phone: z.string().trim().min(9).max(30).optional(),
    role: z.enum(['OPERATOR', 'SUPPLIER', 'CARRIER']),
    companyName: z.string().trim().min(2).max(150).optional(),
    taxId: z.string().trim().min(3).max(50).optional(),
  })
  .strict();
export type CreateInternalUserDto = z.infer<typeof createInternalUserSchema>;

export const listUsersQuerySchema = z
  .object({
    role: z.enum(['ADMIN', 'OPERATOR', 'CLIENT', 'SUPPLIER', 'CARRIER']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  })
  .strict();
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const updateUserStatusSchema = z
  .object({ status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']) })
  .strict();
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

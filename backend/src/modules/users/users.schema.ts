import { z } from 'zod';

// Registo privado - criado exclusivamente pelo Admin
export const createInternalUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(9).optional(),
  role: z.enum(['OPERATOR', 'SUPPLIER', 'CARRIER']),
  companyName: z.string().min(2).optional(),
  taxId: z.string().min(3).optional(),
});
export type CreateInternalUserDto = z.infer<typeof createInternalUserSchema>;

export const listUsersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'OPERATOR', 'CLIENT', 'SUPPLIER', 'CARRIER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
});
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

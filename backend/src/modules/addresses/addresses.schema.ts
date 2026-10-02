import { z } from 'zod';

const addressFields = {
  label: z.string().trim().max(100).optional(),
  street: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(100),
  municipality: z.string().trim().max(100).optional(),
  referencePoint: z.string().trim().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
};

/** `userId` só é aceite para ADMIN/OPERATOR (criar moradas de fornecedores/clientes). */
export const createAddressSchema = z
  .object({ ...addressFields, userId: z.number().int().positive().optional() })
  .strict();
export type CreateAddressDto = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Indique pelo menos um campo a alterar' });
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;

export const listAddressesQuerySchema = z
  .object({ userId: z.coerce.number().int().positive().optional() })
  .strict();

export const addressIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

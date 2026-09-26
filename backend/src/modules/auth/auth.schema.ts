import { z } from 'zod';

// Registo público - EXCLUSIVO para Clientes (restaurantes/compradores a grosso)
export const registerClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  phone: z.string().min(9).optional(),
  companyName: z.string().min(2).optional(),
  taxId: z.string().min(3).optional(),
});
export type RegisterClientDto = z.infer<typeof registerClientSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório'),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

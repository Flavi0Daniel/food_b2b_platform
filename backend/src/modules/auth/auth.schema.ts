import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Email inválido').max(150);
// bcrypt só considera os primeiros 72 bytes: limitar evita truncagem silenciosa e abuso de CPU
const newPassword = z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72, 'Senha demasiado longa (máx. 72)');

// Registo público - EXCLUSIVO para Clientes (restaurantes/compradores a grosso)
export const registerClientSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(150),
    email,
    password: newPassword,
    phone: z.string().trim().min(9).max(30).optional(),
    companyName: z.string().trim().min(2).max(150).optional(),
    taxId: z.string().trim().min(3).max(50).optional(),
  })
  .strict();
export type RegisterClientDto = z.infer<typeof registerClientSchema>;

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Senha é obrigatória').max(128),
  })
  .strict();
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, 'refreshToken é obrigatório').max(2048),
  })
  .strict();
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

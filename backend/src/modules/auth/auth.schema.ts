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

// Edição do próprio perfil (qualquer perfil: ADMIN, OPERATOR, CLIENT, SUPPLIER, CARRIER).
// Email não é editável aqui (exigiria um fluxo de reverificação) - de propósito, não é um esquecimento.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    phone: z.string().trim().min(9).max(30).optional(),
    companyName: z.string().trim().min(2).max(150).optional(),
    taxId: z.string().trim().min(3).max(50).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indique pelo menos um campo a alterar' });
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória').max(128),
    newPassword,
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email }).strict();
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório').max(255),
    newPassword,
  })
  .strict();
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

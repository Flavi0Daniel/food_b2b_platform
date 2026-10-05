import dotenv from 'dotenv';
import { z } from 'zod';

// z.coerce.boolean() trataria a string "false" vinda do .env como true (Boolean("false") === true).
const envBoolean = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === 'true' || v === '1'));

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET deve ter pelo menos 10 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET deve ter pelo menos 10 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  // Usado para montar o link de recuperação de senha enviado por email
  FRONTEND_URL: z.string().default('http://localhost:4200'),

  UPLOAD_DIR: z.string().default('uploads'),

  // SMTP opcional: se SMTP_HOST não for definido, os emails ficam em fila (email_outbox)
  // sem serem enviados, em vez de o arranque falhar. Útil em desenvolvimento sem SMTP configurado.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: envBoolean(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM_NAME: z.string().default('Plataforma B2B Alimentar'),
  MAIL_FROM_EMAIL: z.string().email().default('no-reply@plataforma.ao'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

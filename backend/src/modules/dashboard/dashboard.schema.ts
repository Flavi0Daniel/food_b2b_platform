import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)');

export const dashboardQuerySchema = z
  .object({ from: dateStr.optional(), to: dateStr.optional() })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'A data inicial deve ser anterior (ou igual) à data final',
    path: ['from'],
  });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

import { z } from 'zod';
import { paginationShape } from '../../common/utils/pagination';

// Pedido multipart: os campos de texto chegam como string (o ficheiro `proof` é tratado pelo multer)
export const submitPaymentSchema = z
  .object({
    orderId: z.coerce.number().int().positive(),
    method: z.enum(['MULTICAIXA_EXPRESS', 'TRANSFERENCIA']),
    transactionRef: z.string().trim().min(4).max(100).optional(),
  })
  .strict();
export type SubmitPaymentDto = z.infer<typeof submitPaymentSchema>;

export const listPaymentsQuerySchema = z
  .object({
    ...paginationShape,
    status: z.enum(['PENDING', 'VALIDATED', 'REJECTED']).optional(),
    orderId: z.coerce.number().int().positive().optional(),
  })
  .strict();
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

export const paymentIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const validatePaymentSchema = z.object({}).strict();

export const rejectPaymentSchema = z
  .object({ reason: z.string().trim().min(3, 'Indique o motivo da rejeição').max(300) })
  .strict();
export type RejectPaymentDto = z.infer<typeof rejectPaymentSchema>;

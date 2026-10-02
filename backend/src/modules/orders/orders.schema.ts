import { z } from 'zod';
import { paginationShape } from '../../common/utils/pagination';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'AWAITING_APPROVAL',
  'PROCESSING',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;
export const ORDER_PAYMENT_STATUSES = ['PENDING', 'PROOF_SUBMITTED', 'VALIDATED', 'REJECTED'] as const;

function isRealDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const deliveryDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)')
  .refine(isRealDate, 'Data inválida')
  .refine((value) => value >= todayLocal(), 'A data de entrega não pode estar no passado');

const orderItem = z
  .object({
    productId: z.number().int().positive(),
    quantity: z.number().positive().max(100_000).multipleOf(0.01),
  })
  .strict();

export const createOrderSchema = z
  .object({
    deliveryAddressId: z.number().int().positive(),
    requestedDeliveryDate: deliveryDate,
    deliveryWindow: z.string().trim().max(50).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z
      .array(orderItem)
      .min(1, 'A encomenda precisa de pelo menos um item')
      .max(50)
      .refine(
        (items) => new Set(items.map((i) => i.productId)).size === items.length,
        'Produto repetido: junte as quantidades numa única linha',
      ),
  })
  .strict();
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z
  .object({
    ...paginationShape,
    orderStatus: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(ORDER_PAYMENT_STATUSES).optional(),
    clientId: z.coerce.number().int().positive().optional(), // só tem efeito para staff
    search: z
      .string()
      .trim()
      .max(30)
      .regex(/^[A-Za-z0-9-]+$/, 'Pesquisa inválida')
      .optional(),
  })
  .strict();
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const cancelOrderSchema = z
  .object({ reason: z.string().trim().min(3).max(300).optional() })
  .strict();
export type CancelOrderDto = z.infer<typeof cancelOrderSchema>;

export const approveOrderSchema = z
  .object({
    /** Um fornecedor por item da encomenda. */
    assignments: z
      .array(
        z
          .object({ orderItemId: z.number().int().positive(), supplierId: z.number().int().positive() })
          .strict(),
      )
      .min(1)
      .max(100),
    carrierId: z.number().int().positive(),
    pickupScheduledAt: z.string().datetime({ offset: true }).optional(),
    notes: z.string().trim().max(500).optional(), // instruções para os fornecedores
  })
  .strict();
export type ApproveOrderDto = z.infer<typeof approveOrderSchema>;

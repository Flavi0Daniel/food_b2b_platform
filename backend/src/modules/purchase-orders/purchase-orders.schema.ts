import { z } from 'zod';
import { paginationShape } from '../../common/utils/pagination';

export const PO_STATUSES = ['PENDING', 'RECEIVED', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED'] as const;

export const listPurchaseOrdersQuerySchema = z
  .object({
    ...paginationShape,
    status: z.enum(PO_STATUSES).optional(),
    supplierId: z.coerce.number().int().positive().optional(), // só tem efeito para staff
  })
  .strict();
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;

export const poIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

// O fornecedor só avança o estado da preparação; COLLECTED é definido pela transportadora.
export const updatePoStatusSchema = z
  .object({ status: z.enum(['RECEIVED', 'IN_PREPARATION', 'READY_FOR_PICKUP']) })
  .strict();
export type UpdatePoStatusDto = z.infer<typeof updatePoStatusSchema>;

// ADMIN/OPERATOR: cancelar uma ordem de compra ainda não recolhida
export const cancelPoSchema = z
  .object({ reason: z.string().trim().min(3, 'Indique o motivo do cancelamento').max(300) })
  .strict();
export type CancelPoDto = z.infer<typeof cancelPoSchema>;

// ADMIN/OPERATOR: reatribuir a mercadoria a outro fornecedor (ex: o fornecedor original falhou)
export const reassignPoSchema = z
  .object({
    supplierId: z.number().int().positive(),
    carrierId: z.number().int().positive().optional(), // por omissão, mantém a transportadora atual
    reason: z.string().trim().min(3, 'Indique o motivo da reatribuição').max(300),
  })
  .strict();
export type ReassignPoDto = z.infer<typeof reassignPoSchema>;

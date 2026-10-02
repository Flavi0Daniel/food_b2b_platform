import { z } from 'zod';
import { paginationShape } from '../../common/utils/pagination';

export const SHIPMENT_STATUSES = [
  'PENDING_ASSIGNMENT',
  'TO_PICKUP',
  'COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
] as const;

export const listShipmentsQuerySchema = z
  .object({
    ...paginationShape,
    status: z.enum(SHIPMENT_STATUSES).optional(),
    carrierId: z.coerce.number().int().positive().optional(), // só tem efeito para staff
    orderId: z.coerce.number().int().positive().optional(), // só tem efeito para staff
  })
  .strict();
export type ListShipmentsQuery = z.infer<typeof listShipmentsQuerySchema>;

export const shipmentIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

// A entrega (DELIVERED) só acontece via POST /:id/deliver, porque exige a prova de entrega (POD).
export const updateShipmentStatusSchema = z
  .object({ status: z.enum(['COLLECTED', 'IN_TRANSIT', 'FAILED']) })
  .strict();
export type UpdateShipmentStatusDto = z.infer<typeof updateShipmentStatusSchema>;

export const reassignCarrierSchema = z.object({ carrierId: z.number().int().positive() }).strict();
export type ReassignCarrierDto = z.infer<typeof reassignCarrierSchema>;

// Campos de texto não são aceites no POD: só os ficheiros `photo` e/ou `signature`.
export const deliverBodySchema = z.object({}).strict();

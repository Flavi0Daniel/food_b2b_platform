import { AppError } from '../../common/errors/AppError';
import { JwtUserPayload } from '../../common/types';
import { fileUrl } from '../../common/utils/files';
import { buildMeta, offsetOf, PageMeta } from '../../common/utils/pagination';
import { pool, withTransaction } from '../../config/database';
import { notificationsRepository } from '../notifications/notifications.repository';
import { ordersRepository } from '../orders/orders.repository';
import { PaymentRow, paymentsRepository } from './payments.repository';
import { ListPaymentsQuery, RejectPaymentDto, SubmitPaymentDto } from './payments.schema';

function toView(p: PaymentRow) {
  return {
    id: p.id,
    order_id: p.order_id,
    method: p.method,
    amount: p.amount,
    transaction_ref: p.transaction_ref,
    proof_url: fileUrl(p.proof_url),
    status: p.status,
    validated_by: p.validated_by,
    validated_at: p.validated_at,
    created_at: p.created_at,
  };
}

export const paymentsService = {
  /** CLIENTE envia comprovativo e/ou referência. O valor vem SEMPRE da encomenda, nunca do cliente. */
  async submit(actor: JwtUserPayload, dto: SubmitPaymentDto, proof?: Express.Multer.File) {
    const proofPath = proof ? `payments/${proof.filename}` : null;
    if (!proofPath && !dto.transactionRef) {
      throw AppError.badRequest('Envie o comprovativo (proof) e/ou a referência da transação');
    }

    const paymentId = await withTransaction(async (conn) => {
      const order = await ordersRepository.findByIdForUpdate(conn, dto.orderId);
      if (!order || order.client_id !== actor.id) throw AppError.notFound('Encomenda não encontrada');
      if (order.order_status !== 'PENDING_PAYMENT') {
        throw AppError.conflict('Esta encomenda não está a aguardar pagamento');
      }

      if (dto.transactionRef && (await paymentsRepository.findActiveByReference(conn, dto.transactionRef))) {
        throw AppError.conflict('Esta referência de transação já foi utilizada noutro pagamento');
      }

      const id = await paymentsRepository.insert(conn, {
        orderId: order.id,
        method: dto.method,
        amount: order.total_amount,
        proofUrl: proofPath,
        transactionRef: dto.transactionRef ?? null,
      });

      await ordersRepository.updateStatuses(conn, order.id, {
        orderStatus: 'AWAITING_APPROVAL',
        paymentStatus: 'PROOF_SUBMITTED',
      });
      await ordersRepository.insertHistory(conn, order.id, 'AWAITING_APPROVAL', actor.id, 'Comprovativo de pagamento submetido');
      await notificationsRepository.notifyStaff(conn, {
        title: 'Pagamento para validar',
        message: `A encomenda ${order.order_number} tem um comprovativo à espera de validação.`,
        type: 'PAYMENT_SUBMITTED',
        orderId: order.id,
      });
      return id;
    });

    return toView((await paymentsRepository.findById(pool, paymentId))!);
  },

  async list(q: ListPaymentsQuery): Promise<{ items: unknown[]; meta: PageMeta }> {
    const { rows, total } = await paymentsRepository.list(
      { status: q.status, orderId: q.orderId },
      q.pageSize,
      offsetOf(q.page, q.pageSize),
    );
    return {
      items: rows.map((r) => ({
        ...toView(r),
        order_number: r.order_number,
        order_total: r.order_total,
        client: { name: r.client_name, company_name: r.client_company },
      })),
      meta: buildMeta(q.page, q.pageSize, total),
    };
  },

  /** ADMIN confirma que o dinheiro entrou na conta. A encomenda fica pronta para ser aprovada. */
  async validate(actor: JwtUserPayload, paymentId: number) {
    await withTransaction(async (conn) => {
      const preview = await paymentsRepository.findById(conn, paymentId);
      if (!preview) throw AppError.notFound('Pagamento não encontrado');

      // Ordem de bloqueio fixa: encomenda -> pagamento
      const order = await ordersRepository.findByIdForUpdate(conn, preview.order_id);
      const payment = await paymentsRepository.findByIdForUpdate(conn, paymentId);
      if (!order || !payment) throw AppError.notFound('Pagamento não encontrado');

      if (payment.status !== 'PENDING') throw AppError.conflict('Este pagamento já foi tratado');
      if (order.order_status !== 'AWAITING_APPROVAL') {
        throw AppError.conflict('A encomenda já não está a aguardar validação de pagamento');
      }

      await paymentsRepository.markValidated(conn, paymentId, actor.id);
      await ordersRepository.updateStatuses(conn, order.id, { paymentStatus: 'VALIDATED' });
      await ordersRepository.insertHistory(conn, order.id, 'PAYMENT_VALIDATED', actor.id, 'Pagamento validado');
      await notificationsRepository.create(conn, order.client_id, {
        title: 'Pagamento confirmado',
        message: `O pagamento da encomenda ${order.order_number} foi confirmado.`,
        type: 'PAYMENT_VALIDATED',
        orderId: order.id,
      });
    });

    return toView((await paymentsRepository.findById(pool, paymentId))!);
  },

  /** ADMIN rejeita: a encomenda volta a "Pendente Pagamento" para o cliente reenviar. */
  async reject(actor: JwtUserPayload, paymentId: number, dto: RejectPaymentDto) {
    await withTransaction(async (conn) => {
      const preview = await paymentsRepository.findById(conn, paymentId);
      if (!preview) throw AppError.notFound('Pagamento não encontrado');

      const order = await ordersRepository.findByIdForUpdate(conn, preview.order_id);
      const payment = await paymentsRepository.findByIdForUpdate(conn, paymentId);
      if (!order || !payment) throw AppError.notFound('Pagamento não encontrado');

      if (payment.status !== 'PENDING') throw AppError.conflict('Este pagamento já foi tratado');
      if (order.order_status !== 'AWAITING_APPROVAL') {
        throw AppError.conflict('A encomenda já não está a aguardar validação de pagamento');
      }

      await paymentsRepository.markRejected(conn, paymentId, actor.id);
      await ordersRepository.updateStatuses(conn, order.id, {
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: 'REJECTED',
      });
      await ordersRepository.insertHistory(conn, order.id, 'PAYMENT_REJECTED', actor.id, dto.reason);
      await notificationsRepository.create(conn, order.client_id, {
        title: 'Pagamento rejeitado',
        message: `O pagamento da encomenda ${order.order_number} foi rejeitado: ${dto.reason}. Envie um novo comprovativo.`,
        type: 'PAYMENT_REJECTED',
        orderId: order.id,
      });
    });

    return toView((await paymentsRepository.findById(pool, paymentId))!);
  },
};

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiPaginated, ApiSuccess } from '../models/api-response.model';
import { OrderPaymentDetail, PaymentMethod } from '../models/order.model';

export interface SubmitPaymentDto {
  orderId: number;
  method: PaymentMethod;
  transactionRef?: string;
  proof?: File;
}

/** Linha da fila de validação (ADMIN/OPERATOR) — inclui dados da encomenda e do cliente. */
export interface PaymentQueueItem extends OrderPaymentDetail {
  orderId: number;
  orderNumber: string;
  orderTotal: number;
  client: { name: string; companyName: string | null };
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly apiUrl = `${environment.apiUrl}/payments`;

  constructor(private readonly http: HttpClient) {}

  /** multipart/form-data: comprovativo (ficheiro) e/ou referência da transação. */
  submit(dto: SubmitPaymentDto): Observable<OrderPaymentDetail> {
    const form = new FormData();
    form.set('orderId', String(dto.orderId));
    form.set('method', dto.method);
    if (dto.transactionRef) form.set('transactionRef', dto.transactionRef);
    if (dto.proof) form.set('proof', dto.proof, dto.proof.name);

    const headers = new HttpHeaders({ 'X-Idempotency-Key': crypto.randomUUID() });
    return this.http
      .post<ApiSuccess<OrderPaymentDetail>>(this.apiUrl, form, { headers })
      .pipe(map((res) => res.data));
  }

  /** ADMIN/OPERATOR: fila de pagamentos. Por omissão só os pendentes de validação. */
  list(status: 'PENDING' | 'VALIDATED' | 'REJECTED' = 'PENDING', page = 1, pageSize = 20): Observable<ApiPaginated<PaymentQueueItem>> {
    return this.http.get<ApiPaginated<PaymentQueueItem>>(this.apiUrl, { params: { status, page, pageSize } });
  }

  /** Só ADMIN (não OPERATOR) pode validar/rejeitar - ver auth.routes.ts no backend. */
  validate(id: number): Observable<OrderPaymentDetail> {
    return this.http.post<ApiSuccess<OrderPaymentDetail>>(`${this.apiUrl}/${id}/validate`, {}).pipe(map((res) => res.data));
  }

  reject(id: number, reason: string): Observable<OrderPaymentDetail> {
    return this.http
      .post<ApiSuccess<OrderPaymentDetail>>(`${this.apiUrl}/${id}/reject`, { reason })
      .pipe(map((res) => res.data));
  }
}

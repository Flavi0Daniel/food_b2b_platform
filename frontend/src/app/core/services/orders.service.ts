import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiPaginated, ApiSuccess } from '../models/api-response.model';
import { OrderDetail, OrderListItem } from '../models/order.model';

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
}

export interface CreateOrderDto {
  deliveryAddressId: number;
  requestedDeliveryDate: string; // AAAA-MM-DD
  deliveryWindow?: string;
  notes?: string;
  items: CreateOrderItemDto[];
}

export interface ListOrdersFilters {
  page?: number;
  pageSize?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
}

export interface ApproveOrderAssignment {
  orderItemId: number;
  supplierId: number;
}

export interface ApproveOrderDto {
  assignments: ApproveOrderAssignment[];
  carrierId: number;
  pickupScheduledAt?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  /** Operações que criam/alteram dados de negócio exigem uma chave de idempotência única por tentativa. */
  private idempotencyHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Idempotency-Key': crypto.randomUUID() });
  }

  create(dto: CreateOrderDto): Observable<OrderDetail> {
    return this.http
      .post<ApiSuccess<OrderDetail>>(this.apiUrl, dto, { headers: this.idempotencyHeaders() })
      .pipe(map((res) => res.data));
  }

  list(filters: ListOrdersFilters = {}): Observable<ApiPaginated<OrderListItem>> {
    const params: Record<string, string | number> = { page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
    if (filters.orderStatus) params['orderStatus'] = filters.orderStatus;
    if (filters.paymentStatus) params['paymentStatus'] = filters.paymentStatus;
    if (filters.search) params['search'] = filters.search;

    return this.http.get<ApiPaginated<OrderListItem>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<OrderDetail> {
    return this.http.get<ApiSuccess<OrderDetail>>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data));
  }

  cancel(id: number, reason?: string): Observable<OrderDetail> {
    return this.http
      .post<ApiSuccess<OrderDetail>>(`${this.apiUrl}/${id}/cancel`, reason ? { reason } : {})
      .pipe(map((res) => res.data));
  }

  /** ADMIN/OPERATOR: atribui fornecedor a cada item + transportadora. Gera PO(s) + guia(s). */
  approve(id: number, dto: ApproveOrderDto): Observable<OrderDetail> {
    return this.http
      .post<ApiSuccess<OrderDetail>>(`${this.apiUrl}/${id}/approve`, dto, { headers: this.idempotencyHeaders() })
      .pipe(map((res) => res.data));
  }
}

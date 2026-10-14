import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiPaginated, ApiSuccess } from '../models/api-response.model';
import { PurchaseOrder, SupplierStep } from '../models/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly apiUrl = `${environment.apiUrl}/purchase-orders`;

  constructor(private readonly http: HttpClient) {}

  /** O backend devolve só as ordens do próprio fornecedor autenticado. */
  list(page = 1, pageSize = 20, status?: string): Observable<ApiPaginated<PurchaseOrder>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params['status'] = status;
    return this.http.get<ApiPaginated<PurchaseOrder>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<PurchaseOrder> {
    return this.http.get<ApiSuccess<PurchaseOrder>>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data));
  }

  updateStatus(id: number, status: SupplierStep): Observable<PurchaseOrder> {
    return this.http
      .patch<ApiSuccess<PurchaseOrder>>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map((res) => res.data));
  }
}

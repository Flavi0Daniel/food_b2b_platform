import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiPaginated, ApiSuccess } from '../models/api-response.model';
import { CarrierAction, Shipment } from '../models/shipment.model';

@Injectable({ providedIn: 'root' })
export class ShipmentsService {
  private readonly apiUrl = `${environment.apiUrl}/shipments`;

  constructor(private readonly http: HttpClient) {}

  /** O backend devolve só as guias da própria transportadora autenticada. */
  list(page = 1, pageSize = 20, status?: string): Observable<ApiPaginated<Shipment>> {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params['status'] = status;
    return this.http.get<ApiPaginated<Shipment>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Shipment> {
    return this.http.get<ApiSuccess<Shipment>>(`${this.apiUrl}/${id}`).pipe(map((res) => res.data));
  }

  updateStatus(id: number, status: CarrierAction): Observable<Shipment> {
    return this.http
      .patch<ApiSuccess<Shipment>>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map((res) => res.data));
  }

  /** multipart/form-data: foto da carga entregue e/ou assinatura (pelo menos uma). */
  deliver(id: number, files: { photo?: File | null; signature?: File | null }): Observable<Shipment> {
    const form = new FormData();
    if (files.photo) form.set('photo', files.photo, files.photo.name);
    if (files.signature) form.set('signature', files.signature, files.signature.name);
    return this.http.post<ApiSuccess<Shipment>>(`${this.apiUrl}/${id}/deliver`, form).pipe(map((res) => res.data));
  }
}

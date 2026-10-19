import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { Address } from '../models/address.model';

export interface CreateAddressDto {
  label?: string;
  street: string;
  city: string;
  municipality?: string;
  referencePoint?: string;
  isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly apiUrl = `${environment.apiUrl}/addresses`;

  constructor(private readonly http: HttpClient) {}

  /** Sempre as moradas do próprio utilizador autenticado (sem passar userId). */
  list(): Observable<Address[]> {
    return this.http.get<ApiSuccess<Address[]>>(this.apiUrl).pipe(map((res) => res.data));
  }

  create(dto: CreateAddressDto): Observable<Address> {
    return this.http.post<ApiSuccess<Address>>(this.apiUrl, dto).pipe(map((res) => res.data));
  }

  /** ADMIN/OPERATOR: moradas de outro utilizador (ex: morada de recolha de um fornecedor). */
  listForUser(userId: number): Observable<Address[]> {
    return this.http.get<ApiSuccess<Address[]>>(this.apiUrl, { params: { userId } }).pipe(map((res) => res.data));
  }

  createForUser(userId: number, dto: CreateAddressDto): Observable<Address> {
    return this.http.post<ApiSuccess<Address>>(this.apiUrl, { ...dto, userId }).pipe(map((res) => res.data));
  }
}

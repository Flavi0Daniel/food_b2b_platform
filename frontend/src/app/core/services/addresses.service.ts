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

/** Todos opcionais: só se alteram os campos enviados. String vazia limpa os campos opcionais. */
export type UpdateAddressDto = Partial<CreateAddressDto>;

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

  update(id: number, dto: UpdateAddressDto): Observable<Address> {
    return this.http.patch<ApiSuccess<Address>>(`${this.apiUrl}/${id}`, dto).pipe(map((res) => res.data));
  }

  /** O backend recusa (409) moradas já usadas em encomendas ou entregas. */
  remove(id: number): Observable<void> {
    return this.http.delete<ApiSuccess<null>>(`${this.apiUrl}/${id}`).pipe(map((): void => undefined));
  }

  /** ADMIN/OPERATOR: moradas de outro utilizador (ex: morada de recolha de um fornecedor). */
  listForUser(userId: number): Observable<Address[]> {
    return this.http.get<ApiSuccess<Address[]>>(this.apiUrl, { params: { userId } }).pipe(map((res) => res.data));
  }

  createForUser(userId: number, dto: CreateAddressDto): Observable<Address> {
    return this.http.post<ApiSuccess<Address>>(this.apiUrl, { ...dto, userId }).pipe(map((res) => res.data));
  }
}

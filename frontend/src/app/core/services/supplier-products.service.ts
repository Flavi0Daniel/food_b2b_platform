import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { SupplierProduct } from '../models/supplier-product.model';

@Injectable({ providedIn: 'root' })
export class SupplierProductsService {
  private readonly apiUrl = `${environment.apiUrl}/supplier-products`;

  constructor(private readonly http: HttpClient) {}

  /** Fornecedores que têm este produto ativo na sua tabela de preços (para o Admin escolher na aprovação). */
  listByProduct(productId: number): Observable<SupplierProduct[]> {
    return this.http
      .get<ApiSuccess<SupplierProduct[]>>(this.apiUrl, { params: { productId } })
      .pipe(map((res) => res.data.filter((sp) => sp.isActive)));
  }
}

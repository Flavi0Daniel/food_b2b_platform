import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { Category, Product, ProductUnit } from '../models/product.model';

export interface CreateProductDto {
  categoryId: number;
  name: string;
  baseUnit: ProductUnit;
  description?: string;
  sellPrice?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly productsUrl = `${environment.apiUrl}/products`;
  private readonly categoriesUrl = `${environment.apiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  /** O backend já filtra para só devolver disponíveis quando quem pede é CLIENT. */
  list(): Observable<Product[]> {
    return this.http.get<ApiSuccess<Product[]>>(this.productsUrl).pipe(map((res) => res.data));
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<ApiSuccess<Category[]>>(this.categoriesUrl).pipe(map((res) => res.data));
  }

  // ---- Só ADMIN (o backend recusa os restantes perfis) ----

  createCategory(name: string): Observable<Category> {
    return this.http.post<ApiSuccess<Category>>(this.categoriesUrl, { name }).pipe(map((res) => res.data));
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<ApiSuccess<Product>>(this.productsUrl, dto).pipe(map((res) => res.data));
  }

  /** Disponibilizar exige preço de venda definido (o backend devolve 400 se faltar). */
  setAvailability(id: number, isAvailable: boolean): Observable<Product> {
    return this.http
      .patch<ApiSuccess<Product>>(`${this.productsUrl}/${id}/availability`, { isAvailable })
      .pipe(map((res) => res.data));
  }

  setPrice(id: number, sellPrice: number): Observable<Product> {
    return this.http
      .patch<ApiSuccess<Product>>(`${this.productsUrl}/${id}/price`, { sellPrice })
      .pipe(map((res) => res.data));
  }
}

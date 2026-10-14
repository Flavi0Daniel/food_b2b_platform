import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { Category, Product } from '../models/product.model';

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
}

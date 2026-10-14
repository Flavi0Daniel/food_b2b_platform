import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { User, UserRole, UserStatus } from '../models/user.model';

export interface CreateInternalUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'OPERATOR' | 'SUPPLIER' | 'CARRIER';
  companyName?: string;
  taxId?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  list(role?: UserRole, status?: UserStatus): Observable<User[]> {
    const params: Record<string, string> = {};
    if (role) params['role'] = role;
    if (status) params['status'] = status;
    return this.http.get<ApiSuccess<User[]>>(this.apiUrl, { params }).pipe(map((res) => res.data));
  }

  create(dto: CreateInternalUserDto): Observable<User> {
    return this.http.post<ApiSuccess<User>>(this.apiUrl, dto).pipe(map((res) => res.data));
  }

  updateStatus(id: number, status: UserStatus): Observable<User> {
    return this.http.patch<ApiSuccess<User>>(`${this.apiUrl}/${id}/status`, { status }).pipe(map((res) => res.data));
  }
}

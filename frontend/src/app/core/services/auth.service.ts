import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models/api-response.model';
import { AuthResult, User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

export interface RegisterClientDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  taxId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  companyName?: string;
  taxId?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/** Para cada papel, a rota "casa" para onde o utilizador é enviado depois do login. */
const HOME_ROUTE_BY_ROLE: Record<User['role'], string> = {
  ADMIN: '/admin',
  OPERATOR: '/admin',
  CLIENT: '/client',
  SUPPLIER: '/supplier',
  CARRIER: '/carrier',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  /** Estado do utilizador autenticado, observável por toda a app (ex: navbar, guards). */
  private readonly currentUserSubject: BehaviorSubject<User | null>;
  readonly currentUser$: Observable<User | null>;

  constructor(
    private readonly http: HttpClient,
    private readonly storage: TokenStorageService,
    private readonly router: Router,
  ) {
    // Tem de ser inicializado aqui (não como field initializer): os field initializers correm
    // ANTES do corpo do construtor atribuir `this.storage` (parameter property), o que faria
    // `this.storage.getUser()` falhar com "Cannot read properties of undefined".
    this.currentUserSubject = new BehaviorSubject<User | null>(this.storage.getUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.storage.getAccessToken() && !!this.currentUser;
  }

  get accessToken(): string | null {
    return this.storage.getAccessToken();
  }

  homeRouteForCurrentUser(): string {
    return this.currentUser ? HOME_ROUTE_BY_ROLE[this.currentUser.role] : '/auth/login';
  }

  login(dto: LoginDto): Observable<ApiSuccess<AuthResult>> {
    return this.http
      .post<ApiSuccess<AuthResult>>(`${this.apiUrl}/login`, dto)
      .pipe(tap((res) => this.applySession(res.data)));
  }

  registerClient(dto: RegisterClientDto): Observable<ApiSuccess<AuthResult>> {
    return this.http
      .post<ApiSuccess<AuthResult>>(`${this.apiUrl}/register`, dto)
      .pipe(tap((res) => this.applySession(res.data)));
  }

  /** Usado pelo interceptor para renovar o access token quando expira. Não atualiza o utilizador. */
  refreshAccessToken(): Observable<ApiSuccess<AuthResult>> {
    const refreshToken = this.storage.getRefreshToken();
    return this.http
      .post<ApiSuccess<AuthResult>>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(tap((res) => this.storage.setTokens(res.data.accessToken, res.data.refreshToken)));
  }

  logout(): void {
    const refreshToken = this.storage.getRefreshToken();
    // Melhor esforço: mesmo que o pedido falhe (ex: já expirado), a sessão local é sempre limpa.
    this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => this.clearSessionAndRedirect(),
    });
  }

  /** Limpa a sessão imediatamente, sem chamar a API (usado quando o refresh falha). */
  forceLogout(): void {
    this.clearSessionAndRedirect();
  }

  updateProfile(dto: UpdateProfileDto): Observable<ApiSuccess<User>> {
    return this.http.patch<ApiSuccess<User>>(`${this.apiUrl}/me`, dto).pipe(
      tap((res) => {
        // Mantém os tokens, só atualiza os dados do utilizador guardados localmente.
        const access = this.storage.getAccessToken();
        const refresh = this.storage.getRefreshToken();
        if (access && refresh) this.storage.setSession(access, refresh, res.data);
        this.currentUserSubject.next(res.data);
      }),
    );
  }

  /** O backend termina todas as sessões ao trocar a senha; o chamador deve encaminhar para o login. */
  changePassword(dto: ChangePasswordDto): Observable<ApiSuccess<null>> {
    return this.http.patch<ApiSuccess<null>>(`${this.apiUrl}/me/password`, dto);
  }

  forgotPassword(email: string): Observable<ApiSuccess<null>> {
    return this.http.post<ApiSuccess<null>>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<ApiSuccess<null>> {
    return this.http.post<ApiSuccess<null>>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  private applySession(result: AuthResult): void {
    this.storage.setSession(result.accessToken, result.refreshToken, result.user);
    this.currentUserSubject.next(result.user);
  }

  private clearSessionAndRedirect(): void {
    this.storage.clear();
    this.currentUserSubject.next(null);
    void this.router.navigate(['/auth/login']);
  }
}

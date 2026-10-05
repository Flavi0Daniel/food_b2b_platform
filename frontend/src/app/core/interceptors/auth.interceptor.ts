import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Anexa "Authorization: Bearer <token>" a todos os pedidos para a API. Em caso de 401 (token
 * expirado), tenta renovar uma única vez (mesmo que várias chamadas falhem ao mesmo tempo, só
 * dispara UM pedido de refresh — as restantes esperam e repetem com o token novo) antes de
 * desistir e terminar a sessão.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private readonly refreshedToken$ = new BehaviorSubject<string | null>(null);

  constructor(private readonly auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.accessToken;
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((err: unknown) => {
        const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
        if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthEndpoint) {
          return this.handle401(req, next);
        }
        return throwError(() => err);
      }),
    );
  }

  private handle401(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshedToken$.next(null);

      return this.auth.refreshAccessToken().pipe(
        switchMap((res) => {
          this.isRefreshing = false;
          this.refreshedToken$.next(res.data.accessToken);
          return next.handle(this.withToken(req, res.data.accessToken));
        }),
        catchError((err: unknown) => {
          this.isRefreshing = false;
          this.auth.forceLogout();
          return throwError(() => err);
        }),
      );
    }

    // Já há um refresh em curso: espera que termine e repete este pedido com o token novo.
    return this.refreshedToken$.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.withToken(req, token))),
    );
  }

  private withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
}

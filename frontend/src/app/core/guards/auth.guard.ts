import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.isAuthenticated) return true;
    return this.router.createUrlTree(['/auth/login']);
  }
}

/** Reexportado para o uso específico em rotas que só fazem sentido para visitantes (login/registo). */
@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isAuthenticated) return true;
    return this.router.createUrlTree([this.auth.homeRouteForCurrentUser()]);
  }
}

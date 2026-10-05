import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Restringe o acesso a uma rota a um conjunto de perfis, declarado em `data.roles`:
 *
 *   { path: 'dashboard', component: DashboardComponent, canActivate: [RoleGuard], data: { roles: ['ADMIN','OPERATOR'] } }
 *
 * Assume que o AuthGuard já correu antes (coloca sempre os dois juntos num array `canActivate`).
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowedRoles = route.data['roles'] as UserRole[] | undefined;
    const role = this.auth.currentUser?.role;

    if (!allowedRoles || !role || !allowedRoles.includes(role)) {
      return this.router.createUrlTree([this.auth.homeRouteForCurrentUser()]);
    }
    return true;
  }
}

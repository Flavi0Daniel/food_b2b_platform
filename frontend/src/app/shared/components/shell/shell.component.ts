import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface ShellNavItem {
  label: string;
  route: string;
}

/**
 * Layout partilhado por todos os painéis (Admin, Cliente, Fornecedor, Transportadora).
 * Título e itens de navegação vêm de `data` na configuração de rotas de cada módulo, ex:
 *
 *   { path: '', component: ShellComponent, data: { title: 'Painel do Cliente', navItems: [...] },
 *     children: [...] }
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  title = '';
  navItems: ShellNavItem[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.title = (this.route.snapshot.data['title'] as string) ?? '';
    this.navItems = (this.route.snapshot.data['navItems'] as ShellNavItem[]) ?? [];
  }

  logout(): void {
    this.auth.logout();
  }
}

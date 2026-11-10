import { Component, HostListener, OnInit } from '@angular/core';
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
 *
 * Responsivo: a partir de 1024px (lg) o menu lateral fica fixo ao lado do conteúdo; abaixo disso
 * é uma gaveta que se abre pelo botão de menu no cabeçalho.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  title = '';
  navItems: ShellNavItem[] = [];

  /** Só tem efeito abaixo de lg: se a gaveta do menu está aberta. */
  menuOpen = false;

  constructor(
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.title = (this.route.snapshot.data['title'] as string) ?? '';
    this.navItems = (this.route.snapshot.data['navItems'] as ShellNavItem[]) ?? [];
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  /** Se a janela passar a ser larga com a gaveta aberta, fecha-a (o menu já está fixo). */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) this.closeMenu();
  }
}

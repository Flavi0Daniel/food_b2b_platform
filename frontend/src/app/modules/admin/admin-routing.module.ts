import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { ShellComponent, ShellNavItem } from '../../shared/components/shell/shell.component';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';
import { ProfileComponent } from '../../shared/components/profile/profile.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const navItems: ShellNavItem[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Encomendas', route: 'orders' },
  { label: 'Pagamentos', route: 'payments' },
  { label: 'Produtos', route: 'products' },
  { label: 'Fornecedores', route: 'suppliers' },
  { label: 'Transportadoras', route: 'carriers' },
  { label: 'Utilizadores', route: 'users' },
];

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Painel do Administrador', navItems, roles: ['ADMIN', 'OPERATOR'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'orders', component: ComingSoonComponent, data: { pageTitle: 'Encomendas' } },
      { path: 'payments', component: ComingSoonComponent, data: { pageTitle: 'Validação de Pagamentos' } },
      { path: 'products', component: ComingSoonComponent, data: { pageTitle: 'Produtos e Categorias' } },
      { path: 'suppliers', component: ComingSoonComponent, data: { pageTitle: 'Fornecedores' } },
      { path: 'carriers', component: ComingSoonComponent, data: { pageTitle: 'Transportadoras' } },
      { path: 'users', component: ComingSoonComponent, data: { pageTitle: 'Utilizadores Internos' } },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}

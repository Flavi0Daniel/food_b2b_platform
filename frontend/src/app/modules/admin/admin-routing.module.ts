import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { ShellComponent, ShellNavItem } from '../../shared/components/shell/shell.component';
import { ProfileComponent } from '../../shared/components/profile/profile.component';
import { NotificationsComponent } from '../../shared/components/notifications/notifications.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersListComponent } from './orders/orders-list.component';
import { OrderDetailComponent } from './orders/order-detail/order-detail.component';
import { PaymentsQueueComponent } from './payments/payments-queue.component';
import { ProductsAdminComponent } from './products/products-admin.component';
import { UsersAdminComponent, UsersPageConfig } from './users/users-admin.component';
import { SupplierDetailComponent } from './suppliers/supplier-detail.component';

const navItems: ShellNavItem[] = [
  { label: 'Dashboard', route: 'dashboard', icon: 'layout-dashboard' },
  { label: 'Encomendas', route: 'orders', icon: 'clipboard-list' },
  { label: 'Pagamentos', route: 'payments', icon: 'credit-card' },
  { label: 'Produtos', route: 'products', icon: 'package' },
  { label: 'Fornecedores', route: 'suppliers', icon: 'factory' },
  { label: 'Transportadoras', route: 'carriers', icon: 'truck' },
  { label: 'Utilizadores', route: 'users', icon: 'users' },
];

// A mesma página (UsersAdminComponent) serve Fornecedores, Transportadoras e Utilizadores,
// configurada por `data.config`.
const suppliersConfig: UsersPageConfig = {
  title: 'Fornecedores',
  role: 'SUPPLIER',
  createRoles: ['SUPPLIER'],
  detailBase: '/admin/suppliers',
};
const carriersConfig: UsersPageConfig = {
  title: 'Transportadoras',
  role: 'CARRIER',
  createRoles: ['CARRIER'],
};
const usersConfig: UsersPageConfig = {
  title: 'Utilizadores',
  createRoles: ['OPERATOR', 'SUPPLIER', 'CARRIER'],
};

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Painel do Administrador', navItems, roles: ['ADMIN', 'OPERATOR'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'orders', component: OrdersListComponent },
      { path: 'orders/:id', component: OrderDetailComponent },
      { path: 'payments', component: PaymentsQueueComponent },
      { path: 'products', component: ProductsAdminComponent },
      { path: 'suppliers', component: UsersAdminComponent, data: { config: suppliersConfig } },
      { path: 'suppliers/:id', component: SupplierDetailComponent },
      { path: 'carriers', component: UsersAdminComponent, data: { config: carriersConfig } },
      { path: 'users', component: UsersAdminComponent, data: { config: usersConfig } },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}

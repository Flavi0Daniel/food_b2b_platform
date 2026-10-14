import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { ShellComponent, ShellNavItem } from '../../shared/components/shell/shell.component';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';
import { ProfileComponent } from '../../shared/components/profile/profile.component';
import { PurchaseOrdersListComponent } from './purchase-orders/purchase-orders-list.component';
import { PurchaseOrderDetailComponent } from './purchase-orders/purchase-order-detail/purchase-order-detail.component';

const navItems: ShellNavItem[] = [
  { label: 'Ordens de Compra', route: 'purchase-orders' },
  { label: 'Minha Tabela de Preços', route: 'pricing' },
  { label: 'Morada de Recolha', route: 'addresses' },
];

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Painel do Fornecedor', navItems, roles: ['SUPPLIER'] },
    children: [
      { path: '', redirectTo: 'purchase-orders', pathMatch: 'full' },
      { path: 'purchase-orders', component: PurchaseOrdersListComponent },
      { path: 'purchase-orders/:id', component: PurchaseOrderDetailComponent },
      { path: 'pricing', component: ComingSoonComponent, data: { pageTitle: 'Tabela de Preços de Custo' } },
      { path: 'addresses', component: ComingSoonComponent, data: { pageTitle: 'Morada de Recolha' } },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupplierRoutingModule {}

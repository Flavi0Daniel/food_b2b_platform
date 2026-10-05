import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { ShellComponent, ShellNavItem } from '../../shared/components/shell/shell.component';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';
import { ProfileComponent } from '../../shared/components/profile/profile.component';

const navItems: ShellNavItem[] = [
  { label: 'Catálogo', route: 'catalog' },
  { label: 'As Minhas Encomendas', route: 'orders' },
  { label: 'As Minhas Moradas', route: 'addresses' },
];

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Painel do Cliente', navItems, roles: ['CLIENT'] },
    children: [
      { path: '', redirectTo: 'catalog', pathMatch: 'full' },
      { path: 'catalog', component: ComingSoonComponent, data: { pageTitle: 'Catálogo' } },
      { path: 'orders', component: ComingSoonComponent, data: { pageTitle: 'As Minhas Encomendas' } },
      { path: 'addresses', component: ComingSoonComponent, data: { pageTitle: 'As Minhas Moradas' } },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientRoutingModule {}

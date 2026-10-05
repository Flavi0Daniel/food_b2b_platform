import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { ShellComponent, ShellNavItem } from '../../shared/components/shell/shell.component';
import { ComingSoonComponent } from '../../shared/components/coming-soon/coming-soon.component';
import { ProfileComponent } from '../../shared/components/profile/profile.component';

const navItems: ShellNavItem[] = [{ label: 'Guias de Transporte', route: 'shipments' }];

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { title: 'Painel da Transportadora', navItems, roles: ['CARRIER'] },
    children: [
      { path: '', redirectTo: 'shipments', pathMatch: 'full' },
      { path: 'shipments', component: ComingSoonComponent, data: { pageTitle: 'Guias de Transporte' } },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CarrierRoutingModule {}

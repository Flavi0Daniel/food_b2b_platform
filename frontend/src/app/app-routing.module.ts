import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GuestGuard } from './core/guards/auth.guard';
import { LandingComponent } from './landing.component';

const routes: Routes = [
  // GuestGuard: quem já tem sessão ativa salta a landing e vai direto para o seu painel.
  { path: '', component: LandingComponent, canActivate: [GuestGuard] },
  { path: 'auth', loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule) },
  { path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then((m) => m.AdminModule) },
  { path: 'client', loadChildren: () => import('./modules/client/client.module').then((m) => m.ClientModule) },
  { path: 'supplier', loadChildren: () => import('./modules/supplier/supplier.module').then((m) => m.SupplierModule) },
  { path: 'carrier', loadChildren: () => import('./modules/carrier/carrier.module').then((m) => m.CarrierModule) },
  { path: '**', redirectTo: '/' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

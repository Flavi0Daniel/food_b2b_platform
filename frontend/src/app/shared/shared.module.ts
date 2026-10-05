import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Package, ShoppingCart, Truck, Users, LogOut, Bell, LayoutDashboard } from 'lucide-angular';
import { ShellComponent } from './components/shell/shell.component';
import { ComingSoonComponent } from './components/coming-soon/coming-soon.component';
import { ProfileComponent } from './components/profile/profile.component';

// Conjunto inicial de ícones. Adicionar aqui sempre que um novo ícone for usado num template
// (o lucide-angular só inclui no bundle final os ícones explicitamente listados).
const ICONS = { Home, Package, ShoppingCart, Truck, Users, LogOut, Bell, LayoutDashboard };

const commonModules = [CommonModule, ReactiveFormsModule, RouterModule];

@NgModule({
  declarations: [ShellComponent, ComingSoonComponent, ProfileComponent],
  // LucideAngularModule.pick(ICONS) devolve ModuleWithProviders<T> — regista os providers dos
  // ícones, por isso só pode entrar em `imports`. Em `exports` o Angular exige o tipo do módulo
  // em si (não a versão "configurada"); os providers continuam disponíveis na injeção de
  // dependências de qualquer módulo que importe este SharedModule, exportados ou não.
  imports: [...commonModules, LucideAngularModule.pick(ICONS)],
  exports: [...commonModules, LucideAngularModule, ShellComponent, ComingSoonComponent, ProfileComponent],
})
export class SharedModule {}

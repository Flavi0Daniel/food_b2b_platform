import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SupplierRoutingModule } from './supplier-routing.module';

@NgModule({
  imports: [SharedModule, SupplierRoutingModule],
})
export class SupplierModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CarrierRoutingModule } from './carrier-routing.module';

@NgModule({
  imports: [SharedModule, CarrierRoutingModule],
})
export class CarrierModule {}

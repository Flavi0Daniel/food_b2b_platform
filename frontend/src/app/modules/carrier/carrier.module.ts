import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CarrierRoutingModule } from './carrier-routing.module';
import { ShipmentsListComponent } from './shipments/shipments-list.component';
import { ShipmentDetailComponent } from './shipments/shipment-detail/shipment-detail.component';

@NgModule({
  declarations: [ShipmentsListComponent, ShipmentDetailComponent],
  imports: [SharedModule, CarrierRoutingModule],
})
export class CarrierModule {}

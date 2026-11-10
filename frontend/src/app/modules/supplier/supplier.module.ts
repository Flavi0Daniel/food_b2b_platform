import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SupplierRoutingModule } from './supplier-routing.module';
import { PurchaseOrdersListComponent } from './purchase-orders/purchase-orders-list.component';
import { PurchaseOrderDetailComponent } from './purchase-orders/purchase-order-detail/purchase-order-detail.component';
import { SupplierPricingComponent } from './pricing/supplier-pricing.component';
import { SupplierAddressesComponent } from './addresses/supplier-addresses.component';

@NgModule({
  declarations: [PurchaseOrdersListComponent, PurchaseOrderDetailComponent, SupplierPricingComponent, SupplierAddressesComponent],
  imports: [SharedModule, SupplierRoutingModule],
})
export class SupplierModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SupplierRoutingModule } from './supplier-routing.module';
import { PurchaseOrdersListComponent } from './purchase-orders/purchase-orders-list.component';
import { PurchaseOrderDetailComponent } from './purchase-orders/purchase-order-detail/purchase-order-detail.component';

@NgModule({
  declarations: [PurchaseOrdersListComponent, PurchaseOrderDetailComponent],
  imports: [SharedModule, SupplierRoutingModule],
})
export class SupplierModule {}

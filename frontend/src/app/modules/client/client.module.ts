import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ClientRoutingModule } from './client-routing.module';
import { CatalogComponent } from './catalog/catalog.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { OrdersListComponent } from './orders/orders-list.component';
import { OrderDetailComponent } from './orders/order-detail/order-detail.component';
import { AddressesComponent } from './addresses/addresses.component';

@NgModule({
  declarations: [CatalogComponent, CheckoutComponent, OrdersListComponent, OrderDetailComponent, AddressesComponent],
  imports: [SharedModule, ClientRoutingModule],
})
export class ClientModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersListComponent } from './orders/orders-list.component';
import { OrderDetailComponent } from './orders/order-detail/order-detail.component';
import { PaymentsQueueComponent } from './payments/payments-queue.component';
import { ProductsAdminComponent } from './products/products-admin.component';
import { UsersAdminComponent } from './users/users-admin.component';
import { SupplierDetailComponent } from './suppliers/supplier-detail.component';

@NgModule({
  declarations: [
    DashboardComponent,
    OrdersListComponent,
    OrderDetailComponent,
    PaymentsQueueComponent,
    ProductsAdminComponent,
    UsersAdminComponent,
    SupplierDetailComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}

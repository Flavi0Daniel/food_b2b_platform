import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersListComponent } from './orders/orders-list.component';
import { OrderDetailComponent } from './orders/order-detail/order-detail.component';
import { PaymentsQueueComponent } from './payments/payments-queue.component';

@NgModule({
  declarations: [DashboardComponent, OrdersListComponent, OrderDetailComponent, PaymentsQueueComponent],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}

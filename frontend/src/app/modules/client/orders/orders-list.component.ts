import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrdersService } from '../../../core/services/orders.service';
import {
  ORDER_STATUS_LABELS,
  OrderListItem,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  paymentStatusVariant,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent implements OnInit {
  orders: OrderListItem[] = [];
  loading = true;
  errorMessage: string | null = null;

  readonly orderStatusLabel = ORDER_STATUS_LABELS;
  readonly paymentStatusLabel = PAYMENT_STATUS_LABELS;
  readonly orderStatusVariant = orderStatusVariant;
  readonly paymentStatusVariant = paymentStatusVariant;

  constructor(private readonly ordersService: OrdersService) {}

  ngOnInit(): void {
    this.ordersService.list().subscribe({
      next: (res) => {
        this.orders = res.data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar as encomendas.';
        this.loading = false;
      },
    });
  }
}

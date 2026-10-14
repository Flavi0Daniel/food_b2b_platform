import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrdersService } from '../../../core/services/orders.service';
import {
  ORDER_STATUS_LABELS,
  OrderListItem,
  OrderStatus,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  paymentStatusVariant,
} from '../../../core/models/order.model';

const STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os estados' },
  { value: 'PENDING_PAYMENT', label: 'Pendente de Pagamento' },
  { value: 'AWAITING_APPROVAL', label: 'Aguardando Aprovação' },
  { value: 'PROCESSING', label: 'Em Processamento' },
  { value: 'IN_TRANSIT', label: 'Em Trânsito' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

@Component({
  selector: 'app-admin-orders-list',
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent implements OnInit {
  orders: OrderListItem[] = [];
  loading = true;
  errorMessage: string | null = null;

  readonly statusFilters = STATUS_FILTERS;
  statusFilter = '';
  search = '';

  readonly orderStatusLabel = ORDER_STATUS_LABELS;
  readonly paymentStatusLabel = PAYMENT_STATUS_LABELS;
  readonly orderStatusVariant = orderStatusVariant;
  readonly paymentStatusVariant = paymentStatusVariant;

  constructor(private readonly ordersService: OrdersService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;

    this.ordersService
      .list({
        ...(this.statusFilter ? { orderStatus: this.statusFilter } : {}),
        ...(this.search ? { search: this.search } : {}),
      })
      .subscribe({
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

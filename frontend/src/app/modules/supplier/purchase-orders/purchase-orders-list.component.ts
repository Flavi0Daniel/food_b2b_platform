import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PurchaseOrdersService } from '../../../core/services/purchase-orders.service';
import { PurchaseOrder, poStatusLabel, poStatusVariant } from '../../../core/models/purchase-order.model';

@Component({
  selector: 'app-supplier-purchase-orders',
  templateUrl: './purchase-orders-list.component.html',
})
export class PurchaseOrdersListComponent implements OnInit {
  orders: PurchaseOrder[] = [];
  loading = true;
  errorMessage: string | null = null;

  readonly statusLabel = poStatusLabel;
  readonly statusVariant = poStatusVariant;

  constructor(private readonly service: PurchaseOrdersService) {}

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (res) => {
        this.orders = res.data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar as ordens de compra.';
        this.loading = false;
      },
    });
  }
}

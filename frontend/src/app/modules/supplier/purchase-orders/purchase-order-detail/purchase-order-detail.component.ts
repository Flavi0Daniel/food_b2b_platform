import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { PurchaseOrdersService } from '../../../../core/services/purchase-orders.service';
import {
  PO_NEXT_STEP,
  PoNextStep,
  PurchaseOrder,
  poStatusLabel,
  poStatusVariant,
} from '../../../../core/models/purchase-order.model';

@Component({
  selector: 'app-supplier-purchase-order-detail',
  templateUrl: './purchase-order-detail.component.html',
})
export class PurchaseOrderDetailComponent implements OnInit {
  po: PurchaseOrder | null = null;
  loading = true;
  errorMessage: string | null = null;

  updating = false;
  actionError: string | null = null;

  readonly statusLabel = poStatusLabel;
  readonly statusVariant = poStatusVariant;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: PurchaseOrdersService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe({
      next: (po) => {
        this.po = po;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar a ordem de compra.';
        this.loading = false;
      },
    });
  }

  /** O fornecedor só pode dar um passo de cada vez; o backend recusa saltos. */
  get nextStep(): PoNextStep | null {
    return this.po ? (PO_NEXT_STEP[this.po.status] ?? null) : null;
  }

  advance(): void {
    const step = this.nextStep;
    if (!this.po || !step) return;

    this.updating = true;
    this.actionError = null;

    this.service
      .updateStatus(this.po.id, step.status)
      .pipe(finalize(() => (this.updating = false)))
      .subscribe({
        next: (po) => (this.po = po),
        error: (err: HttpErrorResponse) => {
          this.actionError = err.error?.message ?? 'Não foi possível atualizar o estado.';
        },
      });
  }
}

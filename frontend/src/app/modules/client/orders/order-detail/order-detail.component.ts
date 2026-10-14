import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { OrdersService } from '../../../../core/services/orders.service';
import { PaymentsService } from '../../../../core/services/payments.service';
import {
  ORDER_STATUS_LABELS,
  OrderDetail,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  paymentStatusVariant,
} from '../../../../core/models/order.model';
import { shipmentStatusLabel } from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {
  order: OrderDetail | null = null;
  loading = true;
  errorMessage: string | null = null;

  readonly orderStatusLabel = ORDER_STATUS_LABELS;
  readonly paymentStatusLabel = PAYMENT_STATUS_LABELS;
  readonly orderStatusVariant = orderStatusVariant;
  readonly paymentStatusVariant = paymentStatusVariant;
  readonly shipmentStatusLabel = shipmentStatusLabel;

  readonly paymentForm: FormGroup;
  selectedFile: File | null = null;
  paymentSubmitting = false;
  paymentError: string | null = null;

  cancelling = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly fb: FormBuilder,
  ) {
    this.paymentForm = this.fb.group({
      method: ['MULTICAIXA_EXPRESS', [Validators.required]],
      transactionRef: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  get canCancel(): boolean {
    return this.order?.orderStatus === 'PENDING_PAYMENT' || this.order?.orderStatus === 'AWAITING_APPROVAL';
  }

  /** Mostra o formulário de pagamento quando ainda não há nenhum submetido, ou o último foi rejeitado. */
  get needsPayment(): boolean {
    return this.order?.paymentStatus === 'PENDING' || this.order?.paymentStatus === 'REJECTED';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitPayment(): void {
    if (!this.order) return;

    const raw = this.paymentForm.getRawValue();
    if (!raw.transactionRef && !this.selectedFile) {
      this.paymentError = 'Indique a referência da transação e/ou envie o comprovativo.';
      return;
    }

    this.paymentSubmitting = true;
    this.paymentError = null;

    this.paymentsService
      .submit({
        orderId: this.order.id,
        method: raw.method,
        ...(raw.transactionRef ? { transactionRef: raw.transactionRef } : {}),
        ...(this.selectedFile ? { proof: this.selectedFile } : {}),
      })
      .pipe(finalize(() => (this.paymentSubmitting = false)))
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.paymentError = err.error?.message ?? 'Não foi possível submeter o pagamento.';
        },
      });
  }

  cancelOrder(): void {
    if (!this.order || !confirm('Tem a certeza que quer cancelar esta encomenda?')) return;

    this.cancelling = true;
    this.ordersService.cancel(this.order.id).subscribe({
      next: () => {
        this.cancelling = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível cancelar a encomenda.';
        this.cancelling = false;
      },
    });
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.ordersService.getById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar a encomenda.';
        this.loading = false;
      },
    });
  }
}

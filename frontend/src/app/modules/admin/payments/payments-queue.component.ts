import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PaymentsService, PaymentQueueItem } from '../../../core/services/payments.service';
import { FilesService } from '../../../core/services/files.service';

@Component({
  selector: 'app-payments-queue',
  templateUrl: './payments-queue.component.html',
})
export class PaymentsQueueComponent implements OnInit {
  payments: PaymentQueueItem[] = [];
  loading = true;
  errorMessage: string | null = null;

  validatingId: number | null = null;
  rejectingId: number | null = null;
  rejectReason = '';
  actionError: string | null = null;

  constructor(
    private readonly paymentsService: PaymentsService,
    readonly files: FilesService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.paymentsService.list('PENDING').subscribe({
      next: (res) => {
        this.payments = res.data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar os pagamentos.';
        this.loading = false;
      },
    });
  }

  validate(id: number): void {
    this.validatingId = id;
    this.actionError = null;
    this.paymentsService.validate(id).subscribe({
      next: () => {
        this.validatingId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.actionError = err.error?.message ?? 'Não foi possível validar o pagamento.';
        this.validatingId = null;
      },
    });
  }

  startReject(id: number): void {
    this.rejectingId = id;
    this.rejectReason = '';
    this.actionError = null;
  }

  cancelReject(): void {
    this.rejectingId = null;
  }

  confirmReject(): void {
    if (!this.rejectingId) return;
    if (this.rejectReason.trim().length < 3) {
      this.actionError = 'Indique o motivo da rejeição (mínimo 3 caracteres).';
      return;
    }

    const id = this.rejectingId;
    this.paymentsService.reject(id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.rejectingId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.actionError = err.error?.message ?? 'Não foi possível rejeitar o pagamento.';
      },
    });
  }
}

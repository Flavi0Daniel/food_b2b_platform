import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { OrdersService } from '../../../../core/services/orders.service';
import { PaymentsService } from '../../../../core/services/payments.service';
import { SupplierProductsService } from '../../../../core/services/supplier-products.service';
import { UsersService } from '../../../../core/services/users.service';
import { FilesService } from '../../../../core/services/files.service';
import {
  ORDER_STATUS_LABELS,
  OrderDetail,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  paymentStatusVariant,
} from '../../../../core/models/order.model';
import { User } from '../../../../core/models/user.model';
import { SupplierProduct } from '../../../../core/models/supplier-product.model';
import { poStatusLabel, poStatusVariant } from '../../../../core/models/purchase-order.model';
import { shipmentStatusLabel, shipmentStatusVariant } from '../../../../core/models/shipment.model';

interface ItemAssignment {
  orderItemId: number;
  productId: number;
  productName: string;
  suppliers: SupplierProduct[];
  selectedSupplierId: number | null;
  loadingSuppliers: boolean;
}

@Component({
  selector: 'app-admin-order-detail',
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
  readonly poStatusLabel = poStatusLabel;
  readonly poStatusVariant = poStatusVariant;
  readonly shipmentStatusLabel = shipmentStatusLabel;
  readonly shipmentStatusVariant = shipmentStatusVariant;

  // Validação de pagamento
  validatingPaymentId: number | null = null;
  rejectingPaymentId: number | null = null;
  rejectReason = '';
  paymentActionError: string | null = null;

  // Aprovação
  itemAssignments: ItemAssignment[] = [];
  carriers: User[] = [];
  selectedCarrierId: number | null = null;
  pickupScheduledAt = '';
  approveNotes = '';
  approving = false;
  approveError: string | null = null;

  cancelling = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly supplierProductsService: SupplierProductsService,
    private readonly usersService: UsersService,
    readonly files: FilesService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get canCancel(): boolean {
    return this.order?.orderStatus === 'PENDING_PAYMENT' || this.order?.orderStatus === 'AWAITING_APPROVAL';
  }

  get needsApproval(): boolean {
    return this.order?.paymentStatus === 'VALIDATED' && this.order?.orderStatus === 'AWAITING_APPROVAL';
  }

  get canApprove(): boolean {
    return (
      this.itemAssignments.length > 0 &&
      this.itemAssignments.every((a) => a.selectedSupplierId !== null) &&
      this.selectedCarrierId !== null
    );
  }

  validatePayment(paymentId: number): void {
    this.validatingPaymentId = paymentId;
    this.paymentActionError = null;

    this.paymentsService.validate(paymentId).subscribe({
      next: () => {
        this.validatingPaymentId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.paymentActionError = err.error?.message ?? 'Não foi possível validar o pagamento.';
        this.validatingPaymentId = null;
      },
    });
  }

  startReject(paymentId: number): void {
    this.rejectingPaymentId = paymentId;
    this.rejectReason = '';
    this.paymentActionError = null;
  }

  cancelReject(): void {
    this.rejectingPaymentId = null;
  }

  confirmReject(): void {
    if (!this.rejectingPaymentId) return;
    if (this.rejectReason.trim().length < 3) {
      this.paymentActionError = 'Indique o motivo da rejeição (mínimo 3 caracteres).';
      return;
    }

    const paymentId = this.rejectingPaymentId;
    this.paymentActionError = null;

    this.paymentsService.reject(paymentId, this.rejectReason.trim()).subscribe({
      next: () => {
        this.rejectingPaymentId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.paymentActionError = err.error?.message ?? 'Não foi possível rejeitar o pagamento.';
      },
    });
  }

  approve(): void {
    if (!this.order || !this.canApprove || this.selectedCarrierId === null) return;

    this.approving = true;
    this.approveError = null;

    // <input type="datetime-local"> não tem fuso horário - new Date(...).toISOString() assume
    // hora local do navegador e converte para UTC com "Z", que é o formato exigido pelo backend.
    const pickupIso = this.pickupScheduledAt ? new Date(this.pickupScheduledAt).toISOString() : undefined;

    this.ordersService
      .approve(this.order.id, {
        assignments: this.itemAssignments.map((a) => ({
          orderItemId: a.orderItemId,
          supplierId: a.selectedSupplierId!,
        })),
        carrierId: this.selectedCarrierId,
        ...(pickupIso ? { pickupScheduledAt: pickupIso } : {}),
        ...(this.approveNotes ? { notes: this.approveNotes } : {}),
      })
      .pipe(finalize(() => (this.approving = false)))
      .subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.approveError = err.error?.message ?? 'Não foi possível aprovar a encomenda.';
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
        if (order.paymentStatus === 'VALIDATED' && order.orderStatus === 'AWAITING_APPROVAL') {
          this.setupApprovalForm(order);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar a encomenda.';
        this.loading = false;
      },
    });
  }

  private setupApprovalForm(order: OrderDetail): void {
    this.itemAssignments = order.items.map((item) => ({
      orderItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      suppliers: [],
      selectedSupplierId: null,
      loadingSuppliers: true,
    }));

    this.itemAssignments.forEach((assignment) => {
      this.supplierProductsService.listByProduct(assignment.productId).subscribe({
        next: (suppliers) => {
          assignment.suppliers = suppliers;
          assignment.loadingSuppliers = false;
          // Só um fornecedor disponível: pré-seleciona para poupar um clique.
          if (suppliers.length === 1) assignment.selectedSupplierId = suppliers[0].supplierId;
        },
        error: () => (assignment.loadingSuppliers = false),
      });
    });

    this.usersService.list('CARRIER', 'ACTIVE').subscribe({
      next: (carriers) => {
        this.carriers = carriers;
        if (carriers.length === 1) this.selectedCarrierId = carriers[0].id;
      },
    });
  }
}

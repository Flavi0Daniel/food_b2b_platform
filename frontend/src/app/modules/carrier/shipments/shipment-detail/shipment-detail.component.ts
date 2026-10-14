import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ShipmentsService } from '../../../../core/services/shipments.service';
import { FilesService } from '../../../../core/services/files.service';
import {
  CarrierActionDef,
  SHIPMENT_ACTIONS,
  Shipment,
  shipmentStatusLabel,
  shipmentStatusVariant,
} from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-carrier-shipment-detail',
  templateUrl: './shipment-detail.component.html',
})
export class ShipmentDetailComponent implements OnInit {
  shipment: Shipment | null = null;
  loading = true;
  errorMessage: string | null = null;

  actionLoading = false;
  actionError: string | null = null;

  photo: File | null = null;
  signature: File | null = null;
  delivering = false;
  deliverError: string | null = null;

  readonly statusLabel = shipmentStatusLabel;
  readonly statusVariant = shipmentStatusVariant;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: ShipmentsService,
    readonly files: FilesService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe({
      next: (shipment) => {
        this.shipment = shipment;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar a guia.';
        this.loading = false;
      },
    });
  }

  get actions(): CarrierActionDef[] {
    return this.shipment ? (SHIPMENT_ACTIONS[this.shipment.shipmentStatus] ?? []) : [];
  }

  get canDeliver(): boolean {
    const status = this.shipment?.shipmentStatus;
    return status === 'COLLECTED' || status === 'IN_TRANSIT';
  }

  /** O fornecedor ainda não marcou a mercadoria como pronta: o backend recusaria a recolha. */
  get pickupBlocked(): boolean {
    const s = this.shipment;
    return !!s && s.shipmentStatus === 'TO_PICKUP' && !s.readyForPickup;
  }

  runAction(action: CarrierActionDef): void {
    if (!this.shipment) return;
    if (action.danger && !confirm('Tem a certeza? O Admin será notificado do problema.')) return;

    this.actionLoading = true;
    this.actionError = null;

    this.service
      .updateStatus(this.shipment.id, action.status)
      .pipe(finalize(() => (this.actionLoading = false)))
      .subscribe({
        next: (shipment) => (this.shipment = shipment),
        error: (err: HttpErrorResponse) => {
          this.actionError = err.error?.message ?? 'Não foi possível atualizar o estado.';
        },
      });
  }

  onPhotoSelected(event: Event): void {
    this.photo = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onSignatureSelected(event: Event): void {
    this.signature = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  deliver(): void {
    if (!this.shipment) return;
    if (!this.photo && !this.signature) {
      this.deliverError = 'Envie a foto da carga entregue e/ou a assinatura.';
      return;
    }

    this.delivering = true;
    this.deliverError = null;

    this.service
      .deliver(this.shipment.id, { photo: this.photo, signature: this.signature })
      .pipe(finalize(() => (this.delivering = false)))
      .subscribe({
        next: (shipment) => {
          this.shipment = shipment;
          this.photo = null;
          this.signature = null;
        },
        error: (err: HttpErrorResponse) => {
          this.deliverError = err.error?.message ?? 'Não foi possível concluir a entrega.';
        },
      });
  }
}

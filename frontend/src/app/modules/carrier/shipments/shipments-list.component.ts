import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ShipmentsService } from '../../../core/services/shipments.service';
import { Shipment, shipmentStatusLabel, shipmentStatusVariant } from '../../../core/models/shipment.model';

@Component({
  selector: 'app-carrier-shipments',
  templateUrl: './shipments-list.component.html',
})
export class ShipmentsListComponent implements OnInit {
  shipments: Shipment[] = [];
  loading = true;
  errorMessage: string | null = null;

  readonly statusLabel = shipmentStatusLabel;
  readonly statusVariant = shipmentStatusVariant;

  constructor(private readonly service: ShipmentsService) {}

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (res) => {
        this.shipments = res.data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar as guias.';
        this.loading = false;
      },
    });
  }
}

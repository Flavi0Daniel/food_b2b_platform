import { Pipe, PipeTransform } from '@angular/core';
import { orderStatusLabel } from '../../core/models/order.model';
import { UserRole } from '../../core/models/user.model';
import { ROLE_LABELS } from '../../core/models/user-labels';
import { unitLabel } from '../../core/models/unit-labels';

/** Estados e eventos de encomenda em português: {{ h.status | orderStatusLabel }} */
@Pipe({ name: 'orderStatusLabel' })
export class OrderStatusLabelPipe implements PipeTransform {
  transform(status: string | null | undefined): string {
    return status ? orderStatusLabel(status) : '';
  }
}

/** Unidades em português, com plural opcional: {{ item.unit | unitLabel: item.quantity }} */
@Pipe({ name: 'unitLabel' })
export class UnitLabelPipe implements PipeTransform {
  transform(unit: string | null | undefined, quantity?: number | null): string {
    return unitLabel(unit, quantity);
  }
}

/** Perfil em português: {{ user.role | roleLabel }} → "Administrador", "Fornecedor"... */
@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: string | null | undefined): string {
    return role ? (ROLE_LABELS[role as UserRole] ?? role) : '';
  }
}

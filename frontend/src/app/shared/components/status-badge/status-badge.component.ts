import { Component, Input } from '@angular/core';
import { BadgeVariant } from '../../../core/models/order.model';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap" [class]="classes">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() variant: BadgeVariant = 'gray';

  get classes(): string {
    return VARIANT_CLASSES[this.variant];
  }
}

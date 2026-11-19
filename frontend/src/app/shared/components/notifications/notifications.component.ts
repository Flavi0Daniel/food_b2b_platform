import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationItem } from '../../../core/models/notification.model';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  items: NotificationItem[] = [];
  page = 0;
  totalPages = 1;
  unreadOnly = false;

  loading = true;
  loadingMore = false;
  markingAll = false;
  errorMessage: string | null = null;

  private readonly pageSize = 20;

  constructor(
    private readonly service: NotificationsService,
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  get hasMore(): boolean {
    return this.page < this.totalPages;
  }

  onUnreadOnlyChange(event: Event): void {
    this.unreadOnly = (event.target as HTMLInputElement).checked;
    this.reload();
  }

  reload(): void {
    this.page = 0;
    this.totalPages = 1;
    this.items = [];
    this.loading = true;
    this.fetchNextPage();
  }

  loadMore(): void {
    this.loadingMore = true;
    this.fetchNextPage();
  }

  markAll(): void {
    this.markingAll = true;
    this.service
      .markAllRead()
      .pipe(finalize(() => (this.markingAll = false)))
      .subscribe({
        next: () => {
          this.service.refreshUnreadCount();
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = apiErrorMessage(err, 'Não foi possível marcar como lidas.');
        },
      });
  }

  /** Marca como lida (se ainda não estiver) e leva ao sítio a que a notificação diz respeito. */
  open(item: NotificationItem): void {
    if (!item.isRead) {
      item.isRead = true;
      this.service.markRead(item.id).subscribe({
        next: () => this.service.refreshUnreadCount(),
        error: () => (item.isRead = false),
      });
    }

    const link = this.linkFor(item);
    if (link) void this.router.navigateByUrl(link);
  }

  private linkFor(item: NotificationItem): string | null {
    const role = this.auth.currentUser?.role;
    const staff = role === 'ADMIN' || role === 'OPERATOR';

    if (staff && item.relatedOrderId) return `/admin/orders/${item.relatedOrderId}`;
    if (role === 'CLIENT' && item.relatedOrderId) return `/client/orders/${item.relatedOrderId}`;
    if (staff && item.type === 'SUPPLIER_PRICE_INCREASE') return '/admin/suppliers';
    // Fornecedor e Transportadora não recebem ids de encomendas (intermediação cega): levam à lista.
    if (role === 'SUPPLIER' && item.type === 'PRODUCT_UNIT_CHANGED') return '/supplier/pricing';
    if (role === 'SUPPLIER' && item.type?.startsWith('PO_')) return '/supplier/purchase-orders';
    if (role === 'CARRIER' && item.type?.startsWith('SHIPMENT_')) return '/carrier/shipments';
    return null;
  }

  private fetchNextPage(): void {
    this.errorMessage = null;
    this.service
      .list(this.page + 1, this.pageSize, this.unreadOnly)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.loadingMore = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.items = [...this.items, ...res.data];
          this.page = res.meta.page;
          this.totalPages = res.meta.totalPages;
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = apiErrorMessage(err, 'Não foi possível carregar as notificações.');
        },
      });
  }
}

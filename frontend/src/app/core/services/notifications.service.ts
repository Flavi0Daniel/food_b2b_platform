import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiPaginated, ApiSuccess } from '../models/api-response.model';
import { NotificationItem } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  private readonly unreadSubject = new BehaviorSubject<number>(0);
  /** Nº de notificações por ler, para o sino do cabeçalho. */
  readonly unreadCount$ = this.unreadSubject.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private readonly http: HttpClient) {}

  /** Consulta o nº de não lidas já e depois a cada `intervalMs`. Falhas de rede não interrompem o ciclo. */
  startPolling(intervalMs = 30_000): void {
    if (this.pollSub) return;
    this.pollSub = timer(0, intervalMs)
      .pipe(switchMap(() => this.fetchUnreadCount().pipe(catchError(() => of(null)))))
      .subscribe((count) => {
        if (count !== null) this.unreadSubject.next(count);
      });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.unreadSubject.next(0);
  }

  refreshUnreadCount(): void {
    this.fetchUnreadCount().subscribe({
      next: (count) => this.unreadSubject.next(count),
      error: () => undefined,
    });
  }

  list(page = 1, pageSize = 20, unreadOnly = false): Observable<ApiPaginated<NotificationItem>> {
    return this.http.get<ApiPaginated<NotificationItem>>(this.apiUrl, {
      params: { page, pageSize, unreadOnly: String(unreadOnly) },
    });
  }

  markRead(id: number): Observable<void> {
    return this.http.patch<ApiSuccess<null>>(`${this.apiUrl}/${id}/read`, {}).pipe(map((): void => undefined));
  }

  markAllRead(): Observable<void> {
    return this.http.patch<ApiSuccess<null>>(`${this.apiUrl}/read-all`, {}).pipe(map((): void => undefined));
  }

  private fetchUnreadCount(): Observable<number> {
    return this.http
      .get<ApiSuccess<{ unread: number }>>(`${this.apiUrl}/unread-count`)
      .pipe(map((res) => res.data.unread));
  }
}

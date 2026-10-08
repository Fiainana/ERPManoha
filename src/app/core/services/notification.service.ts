import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { AppNotificationItem, NotificationsInbox } from '../models/notification.model';
import { AuthService } from './auth.service';

const POLL_MS = 60_000;
const DISMISS_KEY = 'erpmanoha.notif.dismissed';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private sub?: Subscription;

  readonly loading = signal(false);
  readonly items = signal<AppNotificationItem[]>([]);
  readonly panelOpen = signal(false);

  /** Alertes non écartées localement (id+count). */
  readonly visibleItems = computed(() => {
    const dismissed = this.readDismissed();
    return this.items().filter((it) => dismissed[it.id] !== it.count);
  });

  readonly badge = computed(() => this.visibleItems().length);

  start(): void {
    this.stop();
    if (!this.auth.isAuthenticated()) return;

    this.sub = interval(POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.fetch())
      )
      .subscribe();
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  refresh(): void {
    this.fetch().subscribe();
  }

  togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  dismiss(id: string, count: number): void {
    const map = this.readDismissed();
    map[id] = count;
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
    // force recompute
    this.items.update((list) => [...list]);
  }

  dismissAll(): void {
    const map = this.readDismissed();
    for (const it of this.items()) {
      map[it.id] = it.count;
    }
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
    this.items.update((list) => [...list]);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private fetch() {
    this.loading.set(true);
    return this.http.get<ApiResponse<unknown>>(`${environment.apiUrl}/notifications`).pipe(
      map((res) => {
        const data = this.unwrap(res);
        const bag = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
        const rawItems = Array.isArray(bag['items'] ?? bag['Items'])
          ? ((bag['items'] ?? bag['Items']) as unknown[])
          : [];
        const items: AppNotificationItem[] = rawItems.map((r) => {
          const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
          return {
            id: String(row['id'] ?? row['Id'] ?? ''),
            title: String(row['title'] ?? row['Title'] ?? ''),
            message: String(row['message'] ?? row['Message'] ?? ''),
            count: Number(row['count'] ?? row['Count'] ?? 0) || 0,
            severity: String(row['severity'] ?? row['Severity'] ?? 'info'),
            route: String(row['route'] ?? row['Route'] ?? '/'),
          };
        });
        this.items.set(items.filter((i) => i.id && i.count > 0));
        this.loading.set(false);
        return items;
      }),
      catchError(() => {
        this.loading.set(false);
        return of([] as AppNotificationItem[]);
      })
    );
  }

  private unwrap(res: unknown): unknown {
    if (!res || typeof res !== 'object') return res;
    const o = res as Record<string, unknown>;
    if ('data' in o && o['data'] != null) return o['data'];
    if ('Data' in o && o['Data'] != null) return o['Data'];
    return res;
  }

  private readDismissed(): Record<string, number> {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
}

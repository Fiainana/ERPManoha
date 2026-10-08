import { Injectable, inject, computed, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { DashboardApiService } from './dashboard-api.service';
import {
  DASHBOARD_ACTIONS,
  DASHBOARD_INSIGHTS,
  filterByRoles,
  resolveDashboardProfile,
} from '../domain/dashboard.config';
import { DashboardKpiBundle } from '../models/dashboard-kpi.model';

/**
 * Assemble le dashboard : profil + actions + insights + KPI API selon le rôle.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);

  readonly profile = computed(() => resolveDashboardProfile(this.auth.roles()));
  readonly actions = computed(() => filterByRoles(DASHBOARD_ACTIONS, this.auth.roles()));
  readonly insights = computed(() => filterByRoles(DASHBOARD_INSIGHTS, this.auth.roles()));

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly kpis = signal<DashboardKpiBundle | null>(null);

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.loadForRoles(this.auth.roles()).subscribe({
      next: (bundle) => {
        this.kpis.set(bundle);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.kpis.set(null);
        this.error.set(err?.message || 'Impossible de charger les indicateurs');
      },
    });
  }
}

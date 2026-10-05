import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import {
  DASHBOARD_ACTIONS,
  DASHBOARD_INSIGHTS,
  filterByRoles,
  resolveDashboardProfile,
} from '../domain/dashboard.config';

/**
 * Application service — assemble le dashboard selon les rôles de session.
 * Présentation (features/dashboard) consomme uniquement ce service.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly auth = inject(AuthService);

  readonly profile = computed(() => resolveDashboardProfile(this.auth.roles()));

  readonly actions = computed(() =>
    filterByRoles(DASHBOARD_ACTIONS, this.auth.roles())
  );

  readonly insights = computed(() =>
    filterByRoles(DASHBOARD_INSIGHTS, this.auth.roles())
  );
}

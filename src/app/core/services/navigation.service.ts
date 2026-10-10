import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { AppRole } from '../models/api-response';
import { NAV_GROUPS, NavGroup, NavItem } from '../navigation/nav.config';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly auth = inject(AuthService);

  /** Groupes filtrés selon les rôles de l'utilisateur connecté. */
  readonly groups = computed(() =>
    NAV_GROUPS.map((g) => this.filterGroup(g)).filter((g): g is NavGroup => g !== null)
  );

  canAccess(roles?: AppRole[]): boolean {
    if (!roles?.length) return true;
    return this.auth.hasRole(...roles);
  }

  private filterGroup(group: NavGroup): NavGroup | null {
    if (group.items.length === 0) {
      return this.canAccess(group.roles) ? group : null;
    }

    const items = group.items.filter((item) => this.canAccess(item.roles));
    if (!items.length) return null;

    return { ...group, items };
  }

  /** Titre de page à partir de la route courante. */
  titleForRoute(url: string): string {
    const path = url.split('?')[0];
    if (path === '/' || path === '') return 'Tableau de bord';

    for (const g of NAV_GROUPS) {
      if (g.route === path) return g.label;
      for (const item of g.items) {
        if (item.route === path) return item.label;
      }
    }
    // Écran de détail (ex. /rh/employes/12) : libellé de l'écran parent le plus précis.
    let parent: NavItem | null = null;
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        if (path.startsWith(item.route + '/') && item.route.length > (parent?.route.length ?? 0)) parent = item;
      }
    }
    return parent?.label ?? 'ERPManoha';
  }
}

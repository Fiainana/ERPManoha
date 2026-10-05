import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { NavigationService } from '../core/services/navigation.service';
import { environment } from '../../environments/environment';
import { NavGroup } from '../core/navigation/nav.config';

const SIDEBAR_KEY = 'erpmanoha.sidebar.collapsed';
const MQ_DESKTOP = '(min-width: 960px)';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly nav = inject(NavigationService);
  private readonly router = inject(Router);
  readonly appName = environment.appName;

  readonly collapsed = signal(this.readCollapsed());
  readonly mobileOpen = signal(false);
  readonly isDesktop = signal(
    typeof window !== 'undefined' && window.matchMedia(MQ_DESKTOP).matches
  );
  readonly pageTitle = signal('Tableau de bord');
  readonly expandedGroups = signal<Record<string, boolean>>({});

  private navSub?: Subscription;
  private mq?: MediaQueryList;
  private mqHandler?: (e: MediaQueryListEvent) => void;

  readonly groups = this.nav.groups;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mq = window.matchMedia(MQ_DESKTOP);
      this.mqHandler = (e) => {
        this.isDesktop.set(e.matches);
        if (e.matches) this.mobileOpen.set(false);
        this.syncBodyScroll();
      };
      this.mq.addEventListener('change', this.mqHandler);
      this.isDesktop.set(this.mq.matches);
    }

    this.pageTitle.set(this.nav.titleForRoute(this.router.url));
    this.expandActiveGroup(this.router.url);

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.mobileOpen.set(false);
        this.syncBodyScroll();
        this.pageTitle.set(this.nav.titleForRoute(e.urlAfterRedirects));
        this.expandActiveGroup(e.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    if (this.mq && this.mqHandler) {
      this.mq.removeEventListener('change', this.mqHandler);
    }
    document.body.classList.remove('shell-nav-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileOpen()) this.closeMobile();
  }

  toggleSidebar(): void {
    if (this.isDesktop()) {
      const next = !this.collapsed();
      this.collapsed.set(next);
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    } else {
      this.mobileOpen.update((v) => !v);
      this.syncBodyScroll();
    }
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
    this.syncBodyScroll();
  }

  toggleGroup(id: string): void {
    this.expandedGroups.update((map) => ({
      ...map,
      [id]: !map[id],
    }));
  }

  isGroupExpanded(group: NavGroup): boolean {
    if (!group.items.length) return false;
    return !!this.expandedGroups()[group.id];
  }

  isGroupActive(group: NavGroup): boolean {
    const url = this.router.url.split('?')[0];
    if (group.route && (url === group.route || (group.route !== '/' && url.startsWith(group.route)))) {
      return true;
    }
    return group.items.some((i) => url === i.route || url.startsWith(i.route + '/'));
  }

  logout(): void {
    this.auth.logout();
  }

  private expandActiveGroup(url: string): void {
    const path = url.split('?')[0];
    for (const g of this.groups()) {
      if (g.items.some((i) => path === i.route || path.startsWith(i.route + '/'))) {
        this.expandedGroups.update((map) => ({ ...map, [g.id]: true }));
      }
    }
  }

  private syncBodyScroll(): void {
    if (typeof document === 'undefined') return;
    if (this.mobileOpen() && !this.isDesktop()) {
      document.body.classList.add('shell-nav-open');
    } else {
      document.body.classList.remove('shell-nav-open');
    }
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  }
}

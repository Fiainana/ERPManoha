import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAchatsService } from '../../core/services/admin-achats.service';
import { BcAchatEntete } from '../../core/models/bc-achat.model';

@Component({
  selector: 'app-bc-achat-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './doc-achat-list.page.html',
  styleUrl: './doc-achat-list.page.scss',
})
export class BcAchatPage implements OnInit {
  private readonly api = inject(AdminAchatsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;
  private readonly search$ = new Subject<string>();

  readonly title = 'BC Achat';
  readonly subtitle = 'Bons de commande fournisseurs Sage';
  readonly breadcrumb = 'BC Achat';
  readonly detailBase = '/achat/bc-achat';
  readonly emptyTitle = 'Aucun BC';
  readonly emptyText = 'Aucune commande fournisseur trouvée.';

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<BcAchatEntete[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly pageSize = 40;

  search = '';

  constructor() {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());
    afterNextRender(() => this.setupObserver());
  }

  ngOnInit(): void {
    this.reload();
  }

  onSearchInput(): void {
    this.search$.next(this.search.trim());
  }

  clearFilters(): void {
    this.search = '';
    this.reload();
  }

  reload(): void {
    this.load(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.load(this.page() + 1, true);
  }

  formatMoney(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  private load(page: number, append: boolean): void {
    if (append) this.loadingMore.set(true);
    else this.loading.set(true);
    this.error.set(null);

    this.api
      .listCommandes({
        search: this.search.trim() || undefined,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (data) => {
          const next = data.items ?? [];
          this.items.set(append ? [...this.items(), ...next] : next);
          this.total.set(data.total ?? 0);
          this.page.set(data.page ?? page);
          const loaded = this.items().length;
          this.hasMore.set(
            loaded < (data.total ?? 0) && (data.page ?? page) < (data.totalPages ?? 0)
          );
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadingMore.set(false);
          this.error.set(err?.message || 'Erreur chargement');
        },
      });
  }

  private setupObserver(): void {
    this.observer?.disconnect();
    const el = this.sentinel()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.loadMore();
      },
      { root: null, rootMargin: '280px', threshold: 0 }
    );
    this.observer.observe(el);
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }
}

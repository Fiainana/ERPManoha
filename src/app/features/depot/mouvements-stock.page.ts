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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MouvementsStockService } from '../../core/services/mouvements-stock.service';
import { DepotOption, MouvementStock } from '../../core/models/mouvement-stock.model';

@Component({
  selector: 'app-mouvements-stock-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './mouvements-stock.page.html',
  styleUrl: './mouvements-stock.page.scss',
})
export class MouvementsStockPage implements OnInit {
  private readonly api = inject(MouvementsStockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;
  private readonly search$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<MouvementStock[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly depots = signal<DepotOption[]>([]);
  readonly pageSize = 40;

  search = '';
  article = '';
  depotNo: number | null = null;
  dateDebut = '';
  dateFin = '';

  constructor() {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());
    afterNextRender(() => this.setupObserver());
  }

  ngOnInit(): void {
    this.loadDepots();
    this.reload();
  }

  onSearchInput(): void {
    this.search$.next(this.filterKey());
  }

  onFilterChange(): void {
    this.reload();
  }

  clearFilters(): void {
    this.search = '';
    this.article = '';
    this.depotNo = null;
    this.dateDebut = '';
    this.dateFin = '';
    this.reload();
  }

  reload(): void {
    this.load(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.load(this.page() + 1, true);
  }

  trackKey(m: MouvementStock, index: number): string {
    return `${m.numeroPiece}|${m.numeroLigne}|${m.articleReference}|${m.dateMouvement}|${index}`;
  }

  isEntree(m: MouvementStock): boolean {
    const s = (m.sens || '').toLowerCase();
    if (s.includes('entrée') || s.includes('entree')) return true;
    return (m.quantiteMouvement ?? 0) > 0;
  }

  isSortie(m: MouvementStock): boolean {
    const s = (m.sens || '').toLowerCase();
    if (s.includes('sortie')) return true;
    return (m.quantiteMouvement ?? 0) < 0;
  }

  formatQte(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    const formatted = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 3,
    }).format(abs);
    if (n > 0) return `+${formatted}`;
    if (n < 0) return `−${formatted}`;
    return formatted;
  }

  private filterKey(): string {
    return [this.search, this.article, this.depotNo, this.dateDebut, this.dateFin].join('|');
  }

  private loadDepots(): void {
    this.api.listDepots().subscribe({
      next: (list) => this.depots.set(list),
      error: () => this.depots.set([]),
    });
  }

  private load(page: number, append: boolean): void {
    if (append) this.loadingMore.set(true);
    else this.loading.set(true);
    this.error.set(null);

    this.api
      .list({
        search: this.search.trim() || undefined,
        article: this.article.trim() || undefined,
        depotNo: this.depotNo ?? undefined,
        dateDebut: this.dateDebut || undefined,
        dateFin: this.dateFin || undefined,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (data) => {
          const nextItems = data.items ?? [];
          this.items.set(append ? [...this.items(), ...nextItems] : nextItems);
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
          this.error.set(err?.message || 'Erreur chargement mouvements');
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

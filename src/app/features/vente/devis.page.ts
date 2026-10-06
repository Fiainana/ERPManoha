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
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DevisService } from '../../core/services/devis.service';
import { AuthService } from '../../core/services/auth.service';
import { DevisEntete } from '../../core/models/devis.model';

@Component({
  selector: 'app-devis-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './devis.page.html',
  styleUrl: './devis.page.scss',
})
export class DevisPage implements OnInit {
  private readonly api = inject(DevisService);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;
  private readonly search$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<DevisEntete[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly pdfPiece = signal<string | null>(null);
  readonly pageSize = 30;

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

  exportPdf(ev: Event, piece: string): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (!piece || this.pdfPiece()) return;
    this.pdfPiece.set(piece);
    this.error.set(null);
    this.api.downloadPdf(piece).subscribe({
      next: () => this.pdfPiece.set(null),
      error: (err) => {
        this.pdfPiece.set(null);
        this.error.set(err?.message || 'Export PDF impossible');
      },
    });
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(n) + ' Ar';
  }

  private load(page: number, append: boolean): void {
    if (append) this.loadingMore.set(true);
    else this.loading.set(true);
    this.error.set(null);

    this.api
      .list({
        search: this.search.trim() || undefined,
        page,
        pageSize: this.pageSize,
        mes: !this.auth.isAdmin(),
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
          this.error.set(err?.message || 'Erreur chargement devis');
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

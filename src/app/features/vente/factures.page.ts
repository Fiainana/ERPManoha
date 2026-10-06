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
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FacturesService } from '../../core/services/factures.service';
import { AuthService } from '../../core/services/auth.service';
import { FactureEntete } from '../../core/models/facture.model';

@Component({
  selector: 'app-factures-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './factures.page.html',
  styleUrl: './factures.page.scss',
})
export class FacturesPage implements OnInit {
  private readonly api = inject(FacturesService);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;
  private readonly search$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<FactureEntete[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly pdfPiece = signal<string | null>(null);
  readonly pageSize = 30;

  search = '';
  impayeesSeulement = false;

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
    this.search$.next(`${this.search.trim()}|${this.impayeesSeulement}`);
  }

  onImpayeesChange(): void {
    this.reload();
  }

  clearFilters(): void {
    this.search = '';
    this.impayeesSeulement = false;
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
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  isImpayee(f: FactureEntete): boolean {
    return (f.resteAPayer ?? 0) > 0.0001;
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
        impayees: this.impayeesSeulement || undefined,
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
          this.error.set(err?.message || 'Erreur chargement factures');
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

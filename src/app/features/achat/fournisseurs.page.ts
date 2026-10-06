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
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import { Fournisseur } from '../../core/models/fournisseur.model';

@Component({
  selector: 'app-fournisseurs-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './fournisseurs.page.html',
  styleUrl: './fournisseurs.page.scss',
})
export class FournisseursPage implements OnInit {
  private readonly api = inject(FournisseursService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;
  private readonly search$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<Fournisseur[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly pageSize = 30;

  search = '';
  inclureSommeil = false;

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
    this.search$.next(`${this.search.trim()}|${this.inclureSommeil}`);
  }

  onSommeilChange(): void {
    this.reload();
  }

  clearFilters(): void {
    this.search = '';
    this.inclureSommeil = false;
    this.reload();
  }

  reload(): void {
    this.load(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.load(this.page() + 1, true);
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
        inclureSommeil: this.inclureSommeil || undefined,
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
          this.error.set(err?.message || 'Erreur chargement fournisseurs');
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

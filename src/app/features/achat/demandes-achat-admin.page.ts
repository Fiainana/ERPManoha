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
import { DemandesAchatService } from '../../core/services/demandes-achat.service';
import { DemandeAchatListItem } from '../../core/models/demande-achat.model';

@Component({
  selector: 'app-demandes-achat-admin-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './demandes-achat-admin.page.html',
  styleUrl: './demandes-achat-admin.page.scss',
})
export class DemandesAchatAdminPage implements OnInit {
  private readonly api = inject(DemandesAchatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<DemandeAchatListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly pageSize = 30;

  statutFilter = '';

  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'EnAttenteArticle', label: 'En attente article' },
    { value: 'ArticlePret', label: 'Article prêt → BC' },
    { value: 'CommandeSageCreee', label: 'BC créé' },
    { value: 'Receptionnee', label: 'Réceptionnée' },
    { value: 'Annulee', label: 'Annulée' },
  ];

  constructor() {
    afterNextRender(() => this.setupObserver());
  }

  ngOnInit(): void {
    this.reload();
  }

  onFilterChange(): void {
    this.reload();
  }

  clearFilters(): void {
    this.statutFilter = '';
    this.reload();
  }

  reload(): void {
    this.load(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.load(this.page() + 1, true);
  }

  statutClass(s: string | null | undefined): string {
    const v = (s || '').toLowerCase();
    if (v.includes('annul')) return 'is-cancel';
    if (v.includes('commande') || v.includes('reception') || v.includes('clotur') || v.includes('factur'))
      return 'is-done';
    if (v.includes('attente')) return 'is-wait';
    if (v.includes('pret') || v.includes('envoy')) return 'is-ok';
    return '';
  }

  private load(page: number, append: boolean): void {
    if (append) this.loadingMore.set(true);
    else this.loading.set(true);
    this.error.set(null);

    this.api
      .listAll({
        statut: this.statutFilter || undefined,
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

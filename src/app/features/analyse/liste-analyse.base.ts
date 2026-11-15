import { DestroyRef, Directive, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, Subscription, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalysePeriodeService } from '../../core/services/analyse.service';
import { AnalyseListeParams, AnalysePage } from '../../core/models/analyse.model';

/**
 * Logique commune des listes d'analyse : vue (filtre), tri, recherche et défilement infini
 * (lots de 50 lignes chargés quand le bas de la liste devient visible). Filtres et tri sont
 * reportés dans l'URL : les alertes de la synthèse ouvrent une liste déjà filtrée.
 */
@Directive()
export abstract class ListeAnalyseBase<T, R, E = unknown> {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly periode = inject(AnalysePeriodeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly saisie$ = new Subject<string>();
  private requete?: Subscription;
  private readonly prets = signal(false);

  /** Chargement du premier lot (filtre, tri, période). */
  readonly loading = signal(false);
  /** Chargement d'un lot suivant. */
  readonly loadingSuite = signal(false);
  readonly error = signal<string | null>(null);
  /** Dernière réponse (résumé, total) ; `items` cumule les lots déjà chargés. */
  readonly data = signal<AnalysePage<T, R, E> | null>(null);
  readonly items = signal<T[]>([]);
  readonly fin = signal(false);

  readonly vue = signal('');
  readonly tri = signal('');
  readonly asc = signal(false);
  private page = 1;
  readonly lot = 50;
  search = '';

  protected abstract vueDefaut: string;
  protected abstract triDefaut: string;
  protected abstract charger(p: AnalyseListeParams): Observable<AnalysePage<T, R, E>>;
  /** Paramètres propres à la liste (ex. famille). */
  protected extraParams(): Partial<AnalyseListeParams> {
    return {};
  }

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    queueMicrotask(() => {
      this.vue.set(q.get('vue') ?? this.vueDefaut);
      this.tri.set(q.get('tri') ?? this.triDefaut);
      this.asc.set(q.get('asc') === 'true');
      this.search = q.get('search') ?? '';
      this.initExtra((k) => q.get(k));
      this.prets.set(true);
    });

    this.saisie$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());

    effect(() => {
      this.periode.version();
      if (!this.prets()) return;
      untracked(() => this.load());
    });
  }

  protected initExtra(_get: (k: string) => string | null): void {}

  rechercher(): void {
    this.saisie$.next(this.search);
  }

  choisirVue(v: string): void {
    this.vue.set(v);
    this.load();
  }

  trier(t: string): void {
    if (this.tri() === t) this.asc.set(!this.asc());
    else {
      this.tri.set(t);
      this.asc.set(false);
    }
    this.load();
  }

  fleche(t: string): string {
    return this.tri() === t ? (this.asc() ? '▲' : '▼') : '';
  }

  /** Recharge depuis le début (nouveau filtre, tri, recherche ou période). */
  load(): void {
    this.page = 1;
    this.fin.set(false);
    this.loading.set(true);
    this.majUrl();
    this.lire(true);
  }

  /** Lot suivant, appelé quand le bas de la liste devient visible. */
  suite(): void {
    if (this.loading() || this.loadingSuite() || this.fin() || !this.data()) return;
    this.page++;
    this.loadingSuite.set(true);
    this.lire(false);
  }

  private lire(reset: boolean): void {
    this.error.set(null);
    this.requete?.unsubscribe();
    this.requete = this.charger({
      search: this.search.trim(),
      vue: this.vue(),
      tri: this.tri(),
      asc: this.asc() || undefined,
      page: this.page,
      pageSize: this.lot,
      ...this.extraParams(),
    }).subscribe({
      next: (d) => {
        this.data.set(d);
        this.items.set(reset ? d.items : [...this.items(), ...d.items]);
        this.fin.set(d.page >= d.totalPages);
        this.loading.set(false);
        this.loadingSuite.set(false);
      },
      error: (e: Error) => {
        if (!reset) this.page--;
        this.loading.set(false);
        this.loadingSuite.set(false);
        this.error.set(e.message);
      },
    });
  }

  private majUrl(): void {
    const extra = this.extraParams();
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        vue: this.vue() !== this.vueDefaut ? this.vue() : null,
        tri: this.tri() !== this.triDefaut ? this.tri() : null,
        asc: this.asc() ? 'true' : null,
        search: this.search.trim() || null,
        famille: extra.famille || null,
      },
    });
  }
}

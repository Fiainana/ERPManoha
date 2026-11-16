import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { AnalyseListeSimple, FamilleAnalyse } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta, NbPipe } from './analyse-format';

type TriFamille = keyof Pick<
  FamilleAnalyse,
  'caHt' | 'margeBrute' | 'tauxMarquePct' | 'evolutionPct' | 'valeurStock' | 'rotationAn' | 'couvertureJours' | 'valeurDormante'
>;

/** Mix produit par famille : part du CA et de la marge, évolution, stock, rotation et couverture. */
@Component({
  selector: 'app-analyse-familles-page',
  imports: [NbPipe, RouterLink, AnalyseEnteteComponent, CompactPipe, PctPipe, JoursPipe],
  template: `
    <div class="immo analyse" style="--cols: minmax(200px, 2fr) repeat(9, minmax(86px, 1fr)); --min: 1140px">
      <app-analyse-entete titre="Analyse par famille" />

      @if (error()) {
        <div class="alert" role="alert">{{ error() }}</div>
      }

      <div class="panel">
        <div class="table-scroll">
          <div class="thead">
            <span>Famille</span>
            @for (c of colonnes; track c.id) {
              <span class="num">
                <button type="button" [class.is-tri]="tri() === c.id" (click)="trier(c.id)">
                  {{ c.libelle }} {{ tri() === c.id ? (asc() ? '▲' : '▼') : '' }}
                </button>
              </span>
            }
            <span class="num">Ruptures</span>
          </div>
          @if (loading() && !data()) {
            <div class="skeleton">@for (_ of [1, 2, 3, 4]; track $index) {<div class="skeleton__row"></div>}</div>
          }
          <ul class="tbody">
            @for (f of lignes(); track f.code) {
              <li>
                <a class="trow" routerLink="/analyse/articles" [queryParams]="{ famille: f.code || null }">
                  <span class="name">
                    {{ f.intitule }}
                    <span class="sub">{{ f.nbArticlesVendus }} articles vendus · {{ f.nbArticlesEnStock }} en stock</span>
                  </span>
                  <span class="num">{{ f.caHt | compact }}<span class="sub">{{ f.partCaPct | pct }} du CA</span></span>
                  <span class="num" [class.neg]="f.margeBrute < 0">{{ f.margeBrute | compact }}<span class="sub">{{ f.partMargePct | pct }} de la marge</span></span>
                  <span class="num" [class.neg]="(f.tauxMarquePct ?? 0) < 0">{{ f.tauxMarquePct | pct }}</span>
                  <span class="num"><b [class]="sens(f.evolutionPct)">{{ f.evolutionPct | pct: true }}</b></span>
                  <span class="num">{{ f.valeurStock | compact }}</span>
                  <span class="num">{{ f.rotationAn | nb }}</span>
                  <span class="num">{{ f.couvertureJours | jours }}</span>
                  <span class="num">{{ f.valeurDormante | compact }}<span class="sub">{{ f.nbDormants }} articles</span></span>
                  <span class="num">{{ f.nbRuptures }}</span>
                </a>
              </li>
            }
            @if (data(); as d) {
              <li class="trow tfoot">
                <span class="name">Total</span>
                <span class="num">{{ d.caHt | compact }}</span>
                <span class="num">{{ totalMarge() | compact }}</span>
                <span class="num">{{ tauxTotal() | pct }}</span>
                <span></span>
                <span class="num">{{ totalStock() | compact }}</span>
                <span></span><span></span><span></span><span></span>
              </li>
            }
          </ul>
        </div>
      </div>
      <p class="note">Rotation = coût des ventes annualisé / valeur du stock. Couverture = jours de ventes couverts par le stock actuel.</p>
    </div>
  `,
  styleUrl: './analyse.shared.scss',
})
export class AnalyseFamillesPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AnalyseListeSimple<FamilleAnalyse> | null>(null);
  readonly tri = signal<TriFamille>('caHt');
  readonly asc = signal(false);
  readonly sens = sensDelta;

  readonly colonnes: { id: TriFamille; libelle: string }[] = [
    { id: 'caHt', libelle: 'CA HT' },
    { id: 'margeBrute', libelle: 'Marge' },
    { id: 'tauxMarquePct', libelle: 'Taux' },
    { id: 'evolutionPct', libelle: 'Évol.' },
    { id: 'valeurStock', libelle: 'Stock' },
    { id: 'rotationAn', libelle: 'Rotation' },
    { id: 'couvertureJours', libelle: 'Couverture' },
    { id: 'valeurDormante', libelle: 'Dormant' },
  ];

  readonly lignes = computed(() => {
    const items = [...(this.data()?.items ?? [])];
    const k = this.tri();
    const s = this.asc() ? 1 : -1;
    return items.sort((a, b) => s * ((a[k] ?? -Infinity) - (b[k] ?? -Infinity)));
  });
  readonly totalMarge = computed(() => (this.data()?.items ?? []).reduce((s, f) => s + f.margeBrute, 0));
  readonly totalStock = computed(() => (this.data()?.items ?? []).reduce((s, f) => s + f.valeurStock, 0));
  readonly tauxTotal = computed(() => {
    const ca = this.data()?.caHt ?? 0;
    return ca ? Math.round((this.totalMarge() / ca) * 1000) / 10 : null;
  });

  constructor() {
    effect(() => {
      this.periode.version();
      untracked(() => this.load());
    });
  }

  trier(k: TriFamille): void {
    if (this.tri() === k) this.asc.set(!this.asc());
    else {
      this.tri.set(k);
      this.asc.set(false);
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.familles().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }
}

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { AnalyseListeSimple, CommercialAnalyse } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, PctPipe, sensDelta } from './analyse-format';

/** Performance commerciale par représentant : CA, marge, évolution, devis et transformation, encours. */
@Component({
  selector: 'app-analyse-commerciaux-page',
  imports: [AnalyseEnteteComponent, CompactPipe, PctPipe],
  template: `
    <div class="immo analyse" style="--cols: minmax(190px, 1.6fr) repeat(10, minmax(86px, 1fr)); --min: 1160px">
      <app-analyse-entete titre="Analyse des commerciaux" />

      @if (error()) {
        <div class="alert" role="alert">{{ error() }}</div>
      }

      <div class="panel">
        <div class="table-scroll">
          <div class="thead">
            <span>Commercial</span>
            <span class="num">CA HT</span><span class="num">Évol.</span><span class="num">Marge</span><span class="num">Taux</span>
            <span class="num">Factures</span><span class="num">Clients</span><span class="num">Panier</span>
            <span class="num">Devis</span><span class="num">Transfo.</span><span class="num">Encours</span>
          </div>
          @if (loading() && !data()) {
            <div class="skeleton">@for (_ of [1, 2, 3]; track $index) {<div class="skeleton__row"></div>}</div>
          }
          <ul class="tbody">
            @for (c of data()?.items ?? []; track c.coNo) {
              <li class="trow">
                <span class="name">{{ c.nom }}</span>
                <span class="num">{{ c.caHt | compact }}<span class="sub">{{ c.partCaPct | pct }}</span></span>
                <span class="num"><b [class]="sens(c.evolutionPct)">{{ c.evolutionPct | pct: true }}</b><span class="sub">{{ c.caHtN1 | compact }}</span></span>
                <span class="num" [class.neg]="c.margeBrute < 0">{{ c.margeBrute | compact }}</span>
                <span class="num" [class.neg]="(c.tauxMarquePct ?? 0) < 0">{{ c.tauxMarquePct | pct }}</span>
                <span class="num">{{ c.nbFactures }}<span class="sub">retours {{ c.retoursHt | compact }}</span></span>
                <span class="num">{{ c.nbClients }}</span>
                <span class="num">{{ c.panierMoyenHt | compact }}</span>
                <span class="num">{{ c.devisEnCours + c.devisTransformes }}<span class="sub">{{ c.montantDevisEnCoursHt | compact }} en cours</span></span>
                <span class="num">{{ c.tauxTransformationPct | pct }}</span>
                <span class="num" [class.neg]="c.encoursPlus90 > 0">{{ c.encours | compact }}<span class="sub">{{ c.encoursPlus90 ? (c.encoursPlus90 | compact) + ' > 90 j' : '' }}</span></span>
              </li>
            }
          </ul>
        </div>
      </div>
      <p class="note">
        Commercial = représentant Sage de la facture. Transformation = devis de la période déjà facturés / devis de la période.
        Encours = factures non réglées à ce jour.
      </p>
    </div>
  `,
  styleUrl: './analyse.shared.scss',
})
export class AnalyseCommerciauxPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AnalyseListeSimple<CommercialAnalyse> | null>(null);
  readonly sens = sensDelta;

  constructor() {
    effect(() => {
      this.periode.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.commerciaux().subscribe({
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

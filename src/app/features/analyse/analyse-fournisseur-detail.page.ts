import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { FournisseurDetailAnalyse } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { GraphiqueEvolutionComponent, IndicateurSerie } from './graphique-evolution.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta } from './analyse-format';
import { AnalyseFournisseurCatalogueComponent } from './analyse-fournisseur-catalogue.component';

/**
 * Fiche d'analyse d'un fournisseur : évolution des achats, tous ses articles (stock, ventes, mouvements),
 * prix par article, dettes et commandes en cours.
 */
@Component({
  selector: 'app-analyse-fournisseur-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, AnalyseEnteteComponent, GraphiqueEvolutionComponent, AnalyseFournisseurCatalogueComponent, CompactPipe, PctPipe, JoursPipe],
  template: `
    <div class="immo analyse">
      <app-analyse-entete
        [titre]="data()?.fournisseur?.intitule ?? numero()"
        [sousTitre]="numero() + (data()?.fournisseur?.ville ? ' · ' + data()!.fournisseur.ville : '')"
        [fil]="{ libelle: 'Fournisseurs', lien: '/analyse/fournisseurs' }"
      >
        <div class="immo__actions">
          <a class="btn btn--ghost" [routerLink]="['/fournisseurs', numero()]">Fiche fournisseur</a>
        </div>
      </app-analyse-entete>

      @if (error()) {
        <div class="alert" role="alert">{{ error() }}</div>
      }
      @if (loading() && !data()) {
        <div class="panel"><div class="skeleton">@for (_ of [1, 2, 3]; track $index) {<div class="skeleton__row"></div>}</div></div>
      }

      @if (data(); as d) {
        <div class="stats">
          <div class="stat">
            <span>Achats HT</span><strong>{{ d.fournisseur.achatsHt | compact }}</strong>
            <small><b [class]="sens(d.fournisseur.evolutionPct)">{{ d.fournisseur.evolutionPct | pct: true }}</b> vs {{ d.fournisseur.achatsHtN1 | compact }} · {{ d.fournisseur.partAchatsPct | pct }} des achats</small>
          </div>
          <div class="stat" [class.stat--alerte]="(d.fournisseur.variationPrixPct ?? 0) > 0.5">
            <span>Prix d’achat</span><strong>{{ d.fournisseur.variationPrixPct | pct: true }}</strong>
            <small>{{ d.fournisseur.nbHaussesPrix }} hausses sur {{ d.fournisseur.nbArticlesCompares }} articles comparés</small>
          </div>
          <div class="stat">
            <span>Ses articles en vente</span><strong>{{ d.fournisseur.caVentesHt | compact }}</strong>
            <small>taux de marque {{ d.fournisseur.tauxMarqueVentesPct | pct }} · {{ d.fournisseur.nbArticlesPrincipal }} articles</small>
          </div>
          <div class="stat">
            <span>Stock de ses articles</span><strong>{{ d.fournisseur.valeurStock | compact }}</strong>
            <small>couverture {{ d.fournisseur.couvertureJours | jours }}</small>
          </div>
          <div class="stat">
            <span>Dettes</span><strong>{{ d.fournisseur.dettesHt | compact }}</strong>
            <small>{{ d.fournisseur.nbFacturesNonReglees }} factures non réglées</small>
          </div>
          <div class="stat">
            <span>Commandes en cours</span><strong>{{ d.fournisseur.montantBcEnCoursHt | compact }}</strong>
            <small>{{ d.fournisseur.nbBcEnCours }} bons de commande</small>
          </div>
        </div>

        <section class="card">
          <h2>Évolution des achats</h2>
          <app-graphique-evolution
            [tranches]="d.evolution"
            [indicateurs]="indicateurs"
            [granulariteServeur]="d.periode.granulariteAuto ? d.periode.granularite : null"
          />
        </section>

        <app-analyse-fournisseur-catalogue [catalogue]="d.catalogue" />

        <section class="panel" style="--cols: minmax(220px, 2.4fr) repeat(5, minmax(90px, 1fr)); --min: 820px">
          <div class="card" style="border: 0; padding-bottom: 0"><h2>Articles achetés <small>prix unitaire moyen, période et un an plus tôt</small></h2></div>
          <div class="table-scroll">
            <div class="thead">
              <span>Article</span><span class="num">Qté</span><span class="num">Montant HT</span>
              <span class="num">Prix moyen</span><span class="num">Un an plus tôt</span><span class="num">Variation</span>
            </div>
            <ul class="tbody">
              @for (a of d.articles; track a.reference) {
                <li>
                  <a class="trow" [routerLink]="['/analyse/articles', a.reference]">
                    <span class="name"><span class="ref">{{ a.reference }}</span> {{ a.designation }}</span>
                    <span class="num">{{ a.qte | number: '1.0-2' }}</span>
                    <span class="num">{{ a.montantHt | compact }}</span>
                    <span class="num">{{ a.puMoyen === null ? '—' : (a.puMoyen | number: '1.0-0') }}</span>
                    <span class="num">{{ a.puMoyenN1 === null ? '—' : (a.puMoyenN1 | number: '1.0-0') }}</span>
                    <span class="num"><b [class]="sens(a.variationPct, true)">{{ a.variationPct | pct: true }}</b></span>
                  </a>
                </li>
              } @empty {
                <li class="trow"><span class="muted">Aucun achat sur la période.</span></li>
              }
            </ul>
          </div>
        </section>

        <div class="grille-2">
          <section class="panel" style="--cols: minmax(110px, 1.2fr) 0.9fr repeat(3, minmax(80px, 1fr)); --min: 480px">
            <div class="card" style="border: 0; padding-bottom: 0"><h2>Factures à payer</h2></div>
            <div class="table-scroll">
              <div class="thead"><span>Facture</span><span>Date</span><span class="num">TTC</span><span class="num">Reste</span><span class="num">Âge</span></div>
              <ul class="tbody">
                @for (f of d.facturesNonReglees; track f.numeroPiece) {
                  <li class="trow">
                    <span class="ref">{{ f.numeroPiece }}</span>
                    <span>{{ f.date | date: 'dd/MM/yy' }}</span>
                    <span class="num">{{ f.totalTtc | compact }}</span>
                    <span class="num">{{ f.reste | compact }}</span>
                    <span class="num" [class.neg]="f.ageJours > 90">{{ f.ageJours | jours }}</span>
                  </li>
                } @empty {
                  <li class="trow"><span class="muted">Rien à payer.</span></li>
                }
              </ul>
            </div>
          </section>
          <section class="panel" style="--cols: minmax(110px, 1.2fr) 0.9fr minmax(100px, 1.2fr) repeat(2, minmax(80px, 1fr)); --min: 480px">
            <div class="card" style="border: 0; padding-bottom: 0"><h2>Commandes en cours</h2></div>
            <div class="table-scroll">
              <div class="thead"><span>Commande</span><span>Date</span><span>Référence</span><span class="num">HT</span><span class="num">Âge</span></div>
              <ul class="tbody">
                @for (c of d.commandesEnCours; track c.numeroPiece) {
                  <li>
                    <a class="trow" [routerLink]="['/achats/commandes', c.numeroPiece]">
                      <span class="ref">{{ c.numeroPiece }}</span>
                      <span>{{ c.date | date: 'dd/MM/yy' }}</span>
                      <span>{{ c.reference ?? '—' }}</span>
                      <span class="num">{{ c.totalHt | compact }}</span>
                      <span class="num">{{ c.ageJours | jours }}</span>
                    </a>
                  </li>
                } @empty {
                  <li class="trow"><span class="muted">Aucune commande en cours.</span></li>
                }
              </ul>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styleUrl: './analyse.shared.scss',
})
export class AnalyseFournisseurDetailPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);
  readonly numero = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('numero') ?? '')), { initialValue: '' });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<FournisseurDetailAnalyse | null>(null);
  readonly sens = sensDelta;

  readonly indicateurs: IndicateurSerie[] = [
    { id: 'achats', libelle: 'Achats HT', champ: 'achatsHt', champN1: 'achatsHtN1', unite: 'ar' },
    { id: 'factures', libelle: 'Nombre de factures', champ: 'nbFactures', champN1: 'nbFacturesN1', unite: 'nb' },
  ];

  constructor() {
    effect(() => {
      this.periode.versionSerie();
      const n = this.numero();
      if (n) untracked(() => this.load(n));
    });
  }

  load(n: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.fournisseur(n).subscribe({
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

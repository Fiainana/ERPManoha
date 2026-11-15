import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { ClientDetailAnalyse } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { GraphiqueEvolutionComponent, IndicateurSerie } from './graphique-evolution.component';
import { CompactPipe, JoursPipe, LIBELLES_STATUT_CLIENT, PctPipe, sensDelta } from './analyse-format';

/** Fiche d'analyse d'un client : évolution, articles achetés, fidélité (RFM) et impayés. */
@Component({
  selector: 'app-analyse-client-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, AnalyseEnteteComponent, GraphiqueEvolutionComponent, CompactPipe, PctPipe, JoursPipe],
  template: `
    <div class="immo analyse">
      <app-analyse-entete
        [titre]="data()?.client?.intitule ?? numero()"
        [sousTitre]="numero() + (data()?.client?.representant ? ' · ' + data()!.client.representant : '') + (data()?.client?.ville ? ' · ' + data()!.client.ville : '')"
        [fil]="{ libelle: 'Clients', lien: '/analyse/clients' }"
      >
        <div class="immo__actions">
          <a class="btn btn--ghost" [routerLink]="['/vente/clients', numero()]">Fiche client</a>
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
            <span>CA HT</span><strong>{{ d.client.caHt | compact }}</strong>
            <small><b [class]="sens(d.client.evolutionPct)">{{ d.client.evolutionPct | pct: true }}</b> vs {{ d.client.caHtN1 | compact }} · classe {{ d.client.classe ?? '–' }}</small>
          </div>
          <div class="stat" [class.stat--alerte]="d.client.margeBrute < 0">
            <span>Marge brute</span><strong>{{ d.client.margeBrute | compact }}</strong>
            <small>Taux de marque {{ d.client.tauxMarquePct | pct }}</small>
          </div>
          <div class="stat">
            <span>Factures</span><strong>{{ d.client.nbFactures }}</strong>
            <small>panier {{ d.client.panierMoyenHt | compact }}{{ d.client.frequenceJours ? ' · tous les ' + d.client.frequenceJours + ' j' : '' }}</small>
          </div>
          <div class="stat">
            <span>Statut</span><strong>{{ statuts[d.client.statut] }}</strong>
            <small>
              @if (d.client.scoreR) {
                RFM {{ d.client.scoreR }}-{{ d.client.scoreF }}-{{ d.client.scoreM }} ·
              }
              client depuis {{ d.client.premiereFacture ? (d.client.premiereFacture | date: 'MM/yyyy') : '—' }}
            </small>
          </div>
          <div class="stat">
            <span>Dernier achat</span>
            <strong>{{ d.client.derniereFacture ? (d.client.derniereFacture | date: 'dd/MM/yyyy') : '—' }}</strong>
            <small>il y a {{ d.client.joursSansAchat | jours }}</small>
          </div>
          <div class="stat" [class.stat--alerte]="d.client.encoursPlus90 > 0">
            <span>Encours</span><strong>{{ d.client.encours | compact }}</strong>
            <small>{{ d.client.encoursPlus90 | compact }} à plus de 90 jours</small>
          </div>
        </div>

        <section class="card">
          <h2>Évolution des achats du client</h2>
          <app-graphique-evolution
            [tranches]="d.evolution"
            [indicateurs]="indicateurs"
            [granulariteServeur]="d.periode.granulariteAuto ? d.periode.granularite : null"
          />
        </section>

        <div class="grille-2">
          <section class="panel" style="--cols: minmax(180px, 2.2fr) repeat(4, minmax(70px, 1fr)); --min: 560px">
            <div class="card" style="border: 0; padding-bottom: 0"><h2>Articles achetés <small>sur la période</small></h2></div>
            <div class="table-scroll">
              <div class="thead"><span>Article</span><span class="num">Qté</span><span class="num">CA HT</span><span class="num">Taux</span><span class="num">Dernier</span></div>
              <ul class="tbody">
                @for (a of d.topArticles; track a.reference) {
                  <li>
                    <a class="trow" [routerLink]="['/analyse/articles', a.reference]">
                      <span class="name"><span class="ref">{{ a.reference }}</span> {{ a.designation }}</span>
                      <span class="num">{{ a.qte | number: '1.0-2' }}</span>
                      <span class="num">{{ a.caHt | compact }}</span>
                      <span class="num" [class.neg]="(a.tauxMarquePct ?? 0) < 0">{{ a.tauxMarquePct | pct }}</span>
                      <span class="num">{{ a.derniereVente | date: 'dd/MM/yy' }}</span>
                    </a>
                  </li>
                } @empty {
                  <li class="trow"><span class="muted">Aucun achat sur la période.</span></li>
                }
              </ul>
            </div>
          </section>

          <section class="panel" style="--cols: minmax(110px, 1.2fr) 0.9fr repeat(3, minmax(80px, 1fr)); --min: 480px">
            <div class="card" style="border: 0; padding-bottom: 0"><h2>Factures non réglées <small>à ce jour</small></h2></div>
            <div class="table-scroll">
              <div class="thead"><span>Facture</span><span>Date</span><span class="num">TTC</span><span class="num">Reste</span><span class="num">Âge</span></div>
              <ul class="tbody">
                @for (f of d.facturesImpayees; track f.numeroPiece) {
                  <li>
                    <a class="trow" [routerLink]="['/vente/factures', f.numeroPiece]">
                      <span class="ref">{{ f.numeroPiece }}</span>
                      <span>{{ f.date | date: 'dd/MM/yy' }}</span>
                      <span class="num">{{ f.totalTtc | compact }}</span>
                      <span class="num">{{ f.reste | compact }}</span>
                      <span class="num" [class.neg]="f.ageJours > 90">{{ f.ageJours | jours }}</span>
                    </a>
                  </li>
                } @empty {
                  <li class="trow"><span class="muted">Aucune facture en attente de règlement.</span></li>
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
export class AnalyseClientDetailPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);
  readonly numero = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('numero') ?? '')), { initialValue: '' });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<ClientDetailAnalyse | null>(null);
  readonly sens = sensDelta;
  readonly statuts = LIBELLES_STATUT_CLIENT;

  readonly indicateurs: IndicateurSerie[] = [
    { id: 'ca', libelle: 'Chiffre d’affaires HT', champ: 'caHt', champN1: 'caHtN1', unite: 'ar' },
    { id: 'marge', libelle: 'Marge brute', champ: 'margeBrute', champN1: 'margeBruteN1', unite: 'ar' },
    { id: 'taux', libelle: 'Taux de marque', champ: 'tauxMarquePct', champN1: 'tauxMarquePctN1', unite: 'pct' },
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
    this.api.client(n).subscribe({
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

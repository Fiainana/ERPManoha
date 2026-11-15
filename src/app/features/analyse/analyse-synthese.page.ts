import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { AnalyseSynthese, Tranche } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { GraphiqueEvolutionComponent, IndicateurSerie } from './graphique-evolution.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta, NbPipe } from './analyse-format';

/** Synthèse : indicateurs clés, évolution personnalisable, ratios de rentabilité, stock et trésorerie. */
@Component({
  selector: 'app-analyse-synthese-page',
  imports: [NbPipe, RouterLink, AnalyseEnteteComponent, GraphiqueEvolutionComponent, CompactPipe, PctPipe, JoursPipe],
  templateUrl: './analyse-synthese.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseSynthesePage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AnalyseSynthese | null>(null);
  readonly sens = sensDelta;

  readonly indicateurs: IndicateurSerie[] = [
    { id: 'ca', libelle: 'Chiffre d’affaires HT', champ: 'caHt', champN1: 'caHtN1', unite: 'ar' },
    { id: 'marge', libelle: 'Marge brute', champ: 'margeBrute', champN1: 'margeBruteN1', unite: 'ar' },
    { id: 'taux', libelle: 'Taux de marque', champ: 'tauxMarquePct', champN1: 'tauxMarquePctN1', unite: 'pct' },
    { id: 'factures', libelle: 'Nombre de factures', champ: 'nbFactures', champN1: 'nbFacturesN1', unite: 'nb' },
    { id: 'panier', libelle: 'Panier moyen HT', champ: 'panierMoyenHt', champN1: 'panierMoyenHtN1', unite: 'ar' },
    { id: 'retours', libelle: 'Retours HT', champ: 'retoursHt', champN1: 'retoursHtN1', unite: 'ar' },
    { id: 'achats', libelle: 'Achats HT', champ: 'achatsHt', champN1: 'achatsHtN1', unite: 'ar' },
  ];

  constructor() {
    effect(() => {
      this.periode.versionSerie();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.synthese().subscribe({
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

  largeur(t: Tranche, tranches: Tranche[]): number {
    const max = Math.max(...tranches.map((x) => x.montant), 1);
    return (t.montant / max) * 100;
  }

  /** Lien d'alerte « articles?vue=ruptures » → route + paramètres. */
  lien(l: string): { route: string; params: Record<string, string> } {
    const [chemin, qs] = l.split('?');
    const params: Record<string, string> = {};
    new URLSearchParams(qs ?? '').forEach((v, k) => (params[k] = v));
    return { route: `/analyse/${chemin}`, params };
  }
}

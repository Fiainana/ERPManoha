import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { ArticleDetailAnalyse } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { GraphiqueEvolutionComponent, IndicateurSerie } from './graphique-evolution.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta } from './analyse-format';

/** Fiche d'analyse d'un article : évolution des ventes, clients, stock par dépôt, fournisseurs et prix d'achat. */
@Component({
  selector: 'app-analyse-article-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, AnalyseEnteteComponent, GraphiqueEvolutionComponent, CompactPipe, PctPipe, JoursPipe],
  templateUrl: './analyse-article-detail.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseArticleDetailPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);
  readonly reference = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('reference') ?? '')), {
    initialValue: '',
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<ArticleDetailAnalyse | null>(null);
  readonly sens = sensDelta;

  readonly indicateurs: IndicateurSerie[] = [
    { id: 'ca', libelle: 'Chiffre d’affaires HT', champ: 'caHt', champN1: 'caHtN1', unite: 'ar' },
    { id: 'qte', libelle: 'Quantité vendue', champ: 'qte', champN1: 'qteN1', unite: 'nb' },
    { id: 'marge', libelle: 'Marge brute', champ: 'margeBrute', champN1: 'margeBruteN1', unite: 'ar' },
    { id: 'taux', libelle: 'Taux de marque', champ: 'tauxMarquePct', champN1: 'tauxMarquePctN1', unite: 'pct' },
  ];

  constructor() {
    effect(() => {
      this.periode.versionSerie();
      const ref = this.reference();
      if (ref) untracked(() => this.load(ref));
    });
  }

  load(ref: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.article(ref).subscribe({
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

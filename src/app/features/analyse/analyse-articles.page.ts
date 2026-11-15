import { Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyseService } from '../../core/services/analyse.service';
import {
  AnalyseListeParams,
  ArticleAnalyse,
  ArticlesExtra,
  ArticlesResume,
} from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta } from './analyse-format';
import { ListeAnalyseBase } from './liste-analyse.base';
import { ScrollInfiniDirective } from './scroll-infini.directive';

/** Analyse par article : CA, marge, classement ABC, stock, couverture, dormants et ruptures. */
@Component({
  selector: 'app-analyse-articles-page',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    AnalyseEnteteComponent,
    CompactPipe,
    PctPipe,
    JoursPipe,
    ScrollInfiniDirective,
  ],
  templateUrl: './analyse-articles.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseArticlesPage extends ListeAnalyseBase<ArticleAnalyse, ArticlesResume, ArticlesExtra> {
  private readonly api = inject(AnalyseService);
  protected vueDefaut = 'vendus';
  protected triDefaut = 'ca';
  famille = '';
  readonly sens = sensDelta;

  readonly vues = [
    { id: 'vendus', libelle: 'Vendus' },
    { id: 'a', libelle: 'Classe A' },
    { id: 'b', libelle: 'Classe B' },
    { id: 'c', libelle: 'Classe C' },
    { id: 'marge-negative', libelle: 'Vendus à perte' },
    { id: 'marge-faible', libelle: 'Marge faible' },
    { id: 'ruptures', libelle: 'Ruptures' },
    { id: 'sous-mini', libelle: 'Sous le mini' },
    { id: 'dormants', libelle: 'Dormants' },
    { id: 'en-baisse', libelle: 'En baisse' },
    { id: 'en-hausse', libelle: 'En hausse' },
    { id: 'tous', libelle: 'Tous' },
  ];

  protected charger(p: AnalyseListeParams) {
    return this.api.articles(p);
  }

  protected override extraParams(): Partial<AnalyseListeParams> {
    return { famille: this.famille || undefined };
  }

  protected override initExtra(get: (k: string) => string | null): void {
    this.famille = get('famille') ?? '';
  }

  compte(id: string, r: ArticlesResume): number | null {
    switch (id) {
      case 'vendus':
        return r.nbArticlesVendus;
      case 'a':
      case 'b':
      case 'c':
        return r.abc.find((x) => x.classe === id.toUpperCase())?.nbArticles ?? 0;
      case 'marge-negative':
        return r.nbMargeNegative;
      case 'marge-faible':
        return r.nbMargeFaible + r.nbMargeNegative;
      case 'ruptures':
        return r.nbRuptures;
      case 'sous-mini':
        return r.nbSousMini;
      case 'dormants':
        return r.nbDormants;
      default:
        return null;
    }
  }

  changerFamille(): void {
    this.load();
  }
}

import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyseService } from '../../core/services/analyse.service';
import { AnalyseListeParams, FournisseurAnalyse, FournisseursResume } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, JoursPipe, PctPipe, sensDelta } from './analyse-format';
import { ListeAnalyseBase } from './liste-analyse.base';
import { ScrollInfiniDirective } from './scroll-infini.directive';

/** Analyse par fournisseur : volume d'achats, dépendance, hausses de prix, dettes, commandes en cours, rentabilité de ses articles. */
@Component({
  selector: 'app-analyse-fournisseurs-page',
  imports: [FormsModule, RouterLink, DatePipe, AnalyseEnteteComponent, CompactPipe, PctPipe, JoursPipe, ScrollInfiniDirective],
  templateUrl: './analyse-fournisseurs.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseFournisseursPage extends ListeAnalyseBase<FournisseurAnalyse, FournisseursResume> {
  private readonly api = inject(AnalyseService);
  protected vueDefaut = 'actifs';
  protected triDefaut = 'achats';
  readonly sens = sensDelta;

  readonly vues = [
    { id: 'actifs', libelle: 'Actifs' },
    { id: 'a', libelle: 'Classe A' },
    { id: 'b', libelle: 'Classe B' },
    { id: 'c', libelle: 'Classe C' },
    { id: 'hausse-prix', libelle: 'Hausses de prix' },
    { id: 'en-hausse', libelle: 'Achats en hausse' },
    { id: 'en-baisse', libelle: 'Achats en baisse' },
    { id: 'dettes', libelle: 'À payer' },
    { id: 'bc-en-cours', libelle: 'Commandes en cours' },
    { id: 'tous', libelle: 'Tous' },
  ];

  protected charger(p: AnalyseListeParams) {
    return this.api.fournisseurs(p);
  }

  compte(id: string, r: FournisseursResume): number | null {
    switch (id) {
      case 'actifs':
        return r.nbActifs;
      case 'a':
      case 'b':
      case 'c':
        return r.abc.find((x) => x.classe === id.toUpperCase())?.nbFournisseurs ?? 0;
      case 'hausse-prix':
        return r.nbFournisseursHaussePrix;
      default:
        return null;
    }
  }
}

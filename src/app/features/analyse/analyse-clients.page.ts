import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyseService } from '../../core/services/analyse.service';
import { AnalyseListeParams, ClientAnalyse, ClientsResume } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, JoursPipe, LIBELLES_STATUT_CLIENT, PctPipe, sensDelta } from './analyse-format';
import { ListeAnalyseBase } from './liste-analyse.base';
import { ScrollInfiniDirective } from './scroll-infini.directive';

/** Analyse par client : CA, marge, fidélité (nouveaux, perdus, en baisse), ABC et risque d'impayé. */
@Component({
  selector: 'app-analyse-clients-page',
  imports: [FormsModule, RouterLink, DatePipe, AnalyseEnteteComponent, CompactPipe, PctPipe, JoursPipe, ScrollInfiniDirective],
  templateUrl: './analyse-clients.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseClientsPage extends ListeAnalyseBase<ClientAnalyse, ClientsResume> {
  private readonly api = inject(AnalyseService);
  protected vueDefaut = 'actifs';
  protected triDefaut = 'ca';
  readonly sens = sensDelta;
  readonly statuts = LIBELLES_STATUT_CLIENT;
  readonly segments: Record<string, string> = {
    Champions: 'Champion',
    Fideles: 'Fidèle',
    GrosAcheteurs: 'Gros acheteur',
    Nouveaux: 'Nouveau',
    AReactiver: 'À réactiver',
    Perdus: 'Perdu',
    ADevelopper: 'À développer',
  };

  readonly vues = [
    { id: 'actifs', libelle: 'Actifs' },
    { id: 'a', libelle: 'Classe A' },
    { id: 'b', libelle: 'Classe B' },
    { id: 'c', libelle: 'Classe C' },
    { id: 'nouveaux', libelle: 'Nouveaux' },
    { id: 'en-hausse', libelle: 'En hausse' },
    { id: 'en-baisse', libelle: 'En baisse' },
    { id: 'perdus', libelle: 'Perdus' },
    { id: 'a-risque', libelle: 'Impayés > 90 j' },
    { id: 'encours', libelle: 'Avec encours' },
    { id: 'tous', libelle: 'Tous' },
  ];

  protected charger(p: AnalyseListeParams) {
    return this.api.clients(p);
  }

  compte(id: string, r: ClientsResume): number | null {
    switch (id) {
      case 'actifs':
        return r.nbActifs;
      case 'a':
      case 'b':
      case 'c':
        return r.abc.find((x) => x.classe === id.toUpperCase())?.nbClients ?? 0;
      case 'nouveaux':
        return r.nbNouveaux;
      case 'en-hausse':
        return r.nbEnHausse;
      case 'en-baisse':
        return r.nbEnBaisse;
      case 'perdus':
        return r.nbPerdus;
      case 'a-risque':
        return r.nbClientsARisque;
      default:
        return null;
    }
  }
}

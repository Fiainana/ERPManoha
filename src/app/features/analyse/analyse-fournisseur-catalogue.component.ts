import { Component, computed, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArticleFournisseurAnalyse, CatalogueFournisseurAnalyse } from '../../core/models/analyse.model';
import { CompactPipe, JoursPipe, NbPipe, PctPipe } from './analyse-format';

type Etat = ArticleFournisseurAnalyse['etat'];
type Tri = 'ca' | 'stock' | 'couverture' | 'commander' | 'achats' | 'vendu' | 'sansVente' | 'reference';

const ETATS: Record<Etat, { libelle: string; ton: string }> = {
  Rupture: { libelle: 'Rupture', ton: 'danger' },
  ACommander: { libelle: 'À commander', ton: 'warn' },
  SousMini: { libelle: 'Sous le mini', ton: 'warn' },
  Dormant: { libelle: 'Dormant', ton: 'danger' },
  Surstock: { libelle: 'Surstock', ton: 'warn' },
  SansVente: { libelle: 'Sans vente', ton: '' },
  NonSuivi: { libelle: 'Non suivi en stock', ton: '' },
  Ok: { libelle: 'Correct', ton: 'EnHausse' },
};

/**
 * Tous les articles d'un fournisseur : état du stock, durée pendant laquelle il tient au rythme des ventes,
 * achats, ventes et mouvements de la période. Filtre par état, recherche, tri, puis derniers mouvements.
 */
@Component({
  selector: 'app-analyse-fournisseur-catalogue',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, CompactPipe, PctPipe, JoursPipe, NbPipe],
  template: `
    @if (catalogue(); as c) {
      <h2 class="section-titre">Ses articles et leur stock</h2>
      <div class="stats">
        <div class="stat">
          <span>Articles</span><strong>{{ c.resume.nbArticles }}</strong>
          <small>{{ c.resume.nbVendus }} vendus sur la période · {{ c.resume.nbEnStock }} en stock</small>
        </div>
        <div class="stat">
          <span>Valeur du stock</span><strong>{{ c.resume.valeurStock | compact }}</strong>
          <small>tient {{ c.resume.couvertureJours | jours }} · rotation {{ c.resume.rotationAn | nb }} fois par an</small>
        </div>
        <div class="stat" [class.stat--alerte]="c.resume.nbRuptures > 0">
          <span>En rupture</span><strong>{{ c.resume.nbRuptures }}</strong>
          <small>vendus sur la période, plus de stock</small>
        </div>
        <div class="stat" [class.stat--alerte]="c.resume.nbACommander > 0">
          <span>À commander</span><strong>{{ c.resume.nbACommander }}</strong>
          <small>stock trop court pour le délai d’appro + 30 jours</small>
        </div>
        <div class="stat" [class.stat--alerte]="c.resume.valeurDormante > 0">
          <span>Stock dormant</span><strong>{{ c.resume.valeurDormante | compact }}</strong>
          <small>{{ c.resume.nbDormants }} articles sans vente depuis {{ c.resume.seuilDormantJours }} j</small>
        </div>
        <div class="stat">
          <span>Surstock</span><strong>{{ c.resume.valeurSurstock | compact }}</strong>
          <small>{{ c.resume.nbSurstock }} articles couverts plus de {{ c.resume.seuilSurstockJours }} j</small>
        </div>
        <div class="stat">
          <span>Mouvements de la période</span><strong>{{ c.resume.entreesQte | nb }} entrées</strong>
          <small>{{ c.resume.sortiesQte | nb }} sorties (quantités)</small>
        </div>
      </div>

      <div class="toolbar">
        <label class="field">
          <span>Recherche</span>
          <input type="text" [ngModel]="recherche()" (ngModelChange)="recherche.set($event); limite.set(pas)" placeholder="Référence, désignation, famille" />
        </label>
        <label class="field field--sm">
          <span>Trier par</span>
          <select [ngModel]="tri()" (ngModelChange)="tri.set($event)">
            <option value="ca">CA de la période</option>
            <option value="vendu">Quantité vendue</option>
            <option value="stock">Valeur du stock</option>
            <option value="couverture">Stock qui tient le moins longtemps</option>
            <option value="commander">Quantité à commander</option>
            <option value="achats">Achats de la période</option>
            <option value="sansVente">Jours sans vente</option>
            <option value="reference">Référence</option>
          </select>
        </label>
      </div>

      <div class="vues" role="group" aria-label="État du stock">
        <button type="button" [class.is-active]="etat() === null" (click)="choisir(null)">Tous <span>{{ c.articles.length }}</span></button>
        @for (e of etatsPresents(); track e.id) {
          <button type="button" [class.is-active]="etat() === e.id" (click)="choisir(e.id)">{{ e.libelle }} <span>{{ e.nb }}</span></button>
        }
      </div>

      <section
        class="panel"
        style="--cols: minmax(230px, 2.4fr) minmax(100px, 0.9fr) repeat(2, minmax(80px, 0.8fr)) minmax(110px, 1fr) repeat(3, minmax(80px, 0.8fr)) minmax(100px, 0.9fr) minmax(110px, 1fr) minmax(80px, 0.8fr); --min: 1380px"
      >
        <div class="table-scroll">
          <div class="thead">
            <span>Article</span><span>État</span>
            <span class="num">Stock dispo</span><span class="num">Valeur</span>
            <span class="num">Le stock tient</span>
            <span class="num">Vendu</span><span class="num">CA HT</span><span class="num">Marge</span>
            <span class="num">Entrées / sorties</span>
            <span class="num">Dernier achat</span><span class="num">À commander</span>
          </div>
          <ul class="tbody">
            @for (a of visibles(); track a.reference) {
              <li>
                <a class="trow" [routerLink]="['/analyse/articles', a.reference]">
                  <span class="name">
                    <span><span class="ref">{{ a.reference }}</span> {{ a.designation }}</span>
                    <span class="sub">
                      {{ a.famille ?? 'Sans famille' }}{{ a.principal ? '' : ' · autre fournisseur principal' }}{{ a.sommeil ? ' · en sommeil' : '' }}
                    </span>
                  </span>
                  <span><span class="badge" [attr.data-statut]="etats[a.etat].ton">{{ etats[a.etat].libelle }}</span></span>
                  <span class="num">
                    {{ a.qteDisponible | nb }}
                    @if (a.qteReservee) {
                      <span class="sub">{{ a.qteReservee | nb }} réservés</span>
                    }
                  </span>
                  <span class="num">{{ a.valeurStock | compact }}</span>
                  <span class="num">
                    {{ a.couvertureJours | jours }}
                    @if (a.ruptureEstimee && a.qteDisponible > 0) {
                      <span class="sub">jusqu’au {{ a.ruptureEstimee | date: 'dd/MM/yy' }}</span>
                    } @else if (a.joursSansVente !== null && a.couvertureJours === null) {
                      <span class="sub">{{ a.joursSansVente | jours }} sans vente</span>
                    }
                  </span>
                  <span class="num">
                    {{ a.qteVendue | nb }}
                    @if (a.venteParJour) {
                      <span class="sub">{{ a.venteParJour * 30 | number: '1.0-1' }} / mois</span>
                    }
                  </span>
                  <span class="num">{{ a.caHt | compact }}</span>
                  <span class="num" [class.neg]="(a.tauxMarquePct ?? 0) < 0">{{ a.tauxMarquePct | pct }}</span>
                  <span class="num">
                    {{ a.entrees | nb }} / {{ a.sorties | nb }}
                    <span class="sub">{{ a.nbMouvements }} mouvement(s)</span>
                  </span>
                  <span class="num">
                    {{ a.dernierAchat ? (a.dernierAchat | date: 'dd/MM/yy') : '—' }}
                    @if (a.dernierPrixAchat !== null) {
                      <span class="sub">{{ a.dernierPrixAchat | number: '1.0-0' }} l’unité</span>
                    }
                  </span>
                  <span class="num">
                    {{ a.qteACommander ? (a.qteACommander | nb) : '—' }}
                    @if (a.qteEnCommande) {
                      <span class="sub">{{ a.qteEnCommande | nb }} en commande</span>
                    }
                  </span>
                </a>
              </li>
            } @empty {
              <li class="trow"><span class="muted">Aucun article pour ce filtre.</span></li>
            }
          </ul>
        </div>
        @if (filtres().length > visibles().length) {
          <div class="pagination">
            <span class="muted">{{ visibles().length }} sur {{ filtres().length }} articles</span>
            <button type="button" class="btn btn--ghost btn--sm" (click)="limite.set(limite() + pas)">Afficher {{ pas }} de plus</button>
          </div>
        }
      </section>

      <section class="panel" style="--cols: 0.7fr minmax(110px, 1fr) minmax(110px, 1fr) minmax(150px, 1.4fr) minmax(220px, 2.2fr) 0.6fr 0.7fr minmax(90px, 0.9fr); --min: 1080px">
        <div class="card" style="border: 0; padding-bottom: 0">
          <h2>Mouvements de stock de ses articles <small>les {{ c.mouvements.length }} plus récents de la période</small></h2>
        </div>
        <div class="table-scroll">
          <div class="thead">
            <span>Date</span><span>Type</span><span>Pièce</span><span>Tiers</span><span>Article</span>
            <span>Sens</span><span class="num">Quantité</span><span>Dépôt</span>
          </div>
          <ul class="tbody">
            @for (m of mouvementsVisibles(); track $index) {
              <li class="trow">
                <span>{{ m.date | date: 'dd/MM/yy' }}</span>
                <span>{{ m.typeLibelle }}</span>
                <span class="ref">{{ m.numeroPiece }}</span>
                <span>{{ m.tiers ?? '—' }}</span>
                <span class="name"><a [routerLink]="['/analyse/articles', m.articleReference]"><span class="ref">{{ m.articleReference }}</span> {{ m.designation }}</a></span>
                <span>{{ m.sens }}</span>
                <span class="num" [class.neg]="m.quantite < 0">{{ m.quantite | nb }}</span>
                <span>{{ m.depot ?? '—' }}</span>
              </li>
            } @empty {
              <li class="trow"><span class="muted">Aucun mouvement sur la période.</span></li>
            }
          </ul>
        </div>
        @if (c.mouvements.length > mouvementsVisibles().length) {
          <div class="pagination">
            <span class="muted">{{ mouvementsVisibles().length }} sur {{ c.mouvements.length }} mouvements</span>
            <button type="button" class="btn btn--ghost btn--sm" (click)="limiteMouvements.set(limiteMouvements() + pas)">Afficher {{ pas }} de plus</button>
          </div>
        }
      </section>
    }
  `,
  styleUrl: './analyse.shared.scss',
})
export class AnalyseFournisseurCatalogueComponent {
  readonly catalogue = input<CatalogueFournisseurAnalyse | null>(null);

  readonly etats = ETATS;
  readonly pas = 50;
  readonly etat = signal<Etat | null>(null);
  readonly recherche = signal('');
  readonly tri = signal<Tri>('ca');
  readonly limite = signal(this.pas);
  readonly limiteMouvements = signal(this.pas);

  /** États réellement présents, dans l'ordre d'urgence. */
  readonly etatsPresents = computed(() => {
    const articles = this.catalogue()?.articles ?? [];
    return (Object.keys(ETATS) as Etat[])
      .map((id) => ({ id, libelle: ETATS[id].libelle, nb: articles.filter((a) => a.etat === id).length }))
      .filter((e) => e.nb > 0);
  });

  readonly filtres = computed(() => {
    const etat = this.etat();
    const q = this.recherche().trim().toLowerCase();
    const liste = (this.catalogue()?.articles ?? []).filter(
      (a) =>
        (etat === null || a.etat === etat) &&
        (!q ||
          a.reference.toLowerCase().includes(q) ||
          (a.designation ?? '').toLowerCase().includes(q) ||
          (a.famille ?? '').toLowerCase().includes(q) ||
          (a.referenceFournisseur ?? '').toLowerCase().includes(q))
    );
    const infini = Number.POSITIVE_INFINITY;
    const cle: Record<Tri, (a: ArticleFournisseurAnalyse) => number | string> = {
      ca: (a) => -a.caHt,
      vendu: (a) => -a.qteVendue,
      stock: (a) => -a.valeurStock,
      couverture: (a) => a.couvertureJours ?? infini,
      commander: (a) => -a.qteACommander,
      achats: (a) => -a.achatsHt,
      sansVente: (a) => -(a.joursSansVente ?? (a.qteStock > 0 ? infini : -1)),
      reference: (a) => a.reference,
    };
    const f = cle[this.tri()];
    return [...liste].sort((x, y) => {
      const a = f(x);
      const b = f(y);
      return typeof a === 'string' || typeof b === 'string' ? String(a).localeCompare(String(b)) : a - b;
    });
  });

  readonly visibles = computed(() => this.filtres().slice(0, this.limite()));
  readonly mouvementsVisibles = computed(() => (this.catalogue()?.mouvements ?? []).slice(0, this.limiteMouvements()));

  choisir(etat: Etat | null): void {
    this.etat.set(etat);
    this.limite.set(this.pas);
  }
}

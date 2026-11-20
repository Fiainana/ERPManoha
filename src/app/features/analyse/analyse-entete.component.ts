import { Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AnalysePeriodeService, PRESETS, PresetPeriode } from '../../core/services/analyse.service';

/** En-tête commun du menu Analyse : titre, onglets et choix de la période (partagée entre les écrans). */
@Component({
  selector: 'app-analyse-entete',
  imports: [RouterLink, RouterLinkActive, FormsModule, DatePipe],
  template: `
    <header class="immo__header">
      <div>
        @if (fil()) {
          <nav class="breadcrumb" aria-label="Fil d'Ariane">
            <a routerLink="/analyse">Analyse</a>
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path fill="currentColor" d="M6.7 3.3 5.3 4.7 8.6 8l-3.3 3.3 1.4 1.4L11.4 8z" />
            </svg>
            <a [routerLink]="fil()!.lien">{{ fil()!.libelle }}</a>
          </nav>
        }
        <h1>{{ titre() }}</h1>
        @if (sousTitre()) {
          <p class="immo__subtitle">{{ sousTitre() }}</p>
        }
      </div>
      <ng-content />
    </header>

    @if (!fil()) {
      <nav class="tabs" aria-label="Analyse">
        <a routerLink="/analyse" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Synthèse</a>
        <a routerLink="/analyse/magasin" routerLinkActive="is-active">Magasin</a>
        <a routerLink="/analyse/marketing" routerLinkActive="is-active">Marketing</a>
        <a routerLink="/analyse/articles" routerLinkActive="is-active">Articles</a>
        <a routerLink="/analyse/ventes-journalieres" routerLinkActive="is-active">Ventes par jour</a>
        <a routerLink="/analyse/familles" routerLinkActive="is-active">Familles</a>
        <a routerLink="/analyse/clients" routerLinkActive="is-active">Clients</a>
        <a routerLink="/analyse/fournisseurs" routerLinkActive="is-active">Fournisseurs</a>
        <a routerLink="/analyse/commerciaux" routerLinkActive="is-active">Commerciaux</a>
      </nav>
    }

    <div class="toolbar">
      <label class="field field--sm">
        <span>Période</span>
        <select [ngModel]="periode.preset()" (ngModelChange)="choisir($event)" aria-label="Période">
          @for (p of presets; track p.id) {
            <option [value]="p.id">{{ p.libelle }}</option>
          }
          <option value="perso">Personnalisée</option>
        </select>
      </label>
      <label class="field field--sm">
        <span>Du</span>
        <input type="date" [ngModel]="periode.debut()" (change)="perso($any($event.target).value, periode.fin())" />
      </label>
      <label class="field field--sm">
        <span>Au</span>
        <input type="date" [ngModel]="periode.fin()" (change)="perso(periode.debut(), $any($event.target).value)" />
      </label>
      <p class="note" style="flex: 1; min-width: 220px; align-self: center">
        Comparé au {{ n1Debut() | date: 'dd/MM/yyyy' }} – {{ n1Fin() | date: 'dd/MM/yyyy' }} (même période un an plus tôt).
        Montants HT en Ar.
      </p>
    </div>
  `,
  styleUrl: './analyse.shared.scss',
})
export class AnalyseEnteteComponent {
  readonly periode = inject(AnalysePeriodeService);
  readonly titre = input.required<string>();
  readonly sousTitre = input<string>('');
  /** Écran de détail : lien retour vers la liste à la place des onglets. */
  readonly fil = input<{ libelle: string; lien: string } | null>(null);
  readonly presets = PRESETS;

  choisir(p: PresetPeriode): void {
    this.periode.choisir(p);
  }

  perso(debut: string, fin: string): void {
    this.periode.personnaliser(debut, fin);
  }

  n1Debut(): Date | null {
    return this.moinsUnAn(this.periode.debut());
  }

  n1Fin(): Date | null {
    return this.moinsUnAn(this.periode.fin());
  }

  private moinsUnAn(iso: string): Date | null {
    if (!iso) return null;
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(a - 1, m - 1, j);
  }
}

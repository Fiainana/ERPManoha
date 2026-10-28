import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoDotationResultat } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

@Component({
  selector: 'app-immo-dotations-page',
  imports: [RouterLink, FormsModule, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-dotations.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoDotationsPage {
  private readonly api = inject(ImmoService);

  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly resultat = signal<ImmoDotationResultat | null>(null);

  readonly aujourdhui = new Date();
  annee = this.aujourdhui.getFullYear();
  /** null = tous les mois écoulés de l'année. */
  mois: number | null = null;

  readonly moisListe = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  libelleMois(m: number): string {
    return this.moisListe[m - 1] ?? String(m);
  }

  apercu(): void {
    this.lancer(true);
  }

  /** Confirmation dans la page (une boîte de dialogue du navigateur peut être bloquée). */
  readonly confirmer = signal(false);

  demanderGeneration(): void {
    this.confirmer.set(true);
  }

  generer(): void {
    this.confirmer.set(false);
    this.lancer(false);
  }

  private lancer(apercu: boolean): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);
    this.api.dotations(this.annee, this.mois, apercu).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.resultat.set(r);
        if (!apercu) {
          this.toast.set(
            r.nbLignes > 0
              ? `${r.nbLignes} dotation(s) générée(s)${r.ecriture ? ', écriture ' + r.ecriture.numeroPiece : ''}.`
              : 'Aucune dotation à générer.'
          );
        }
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Calcul impossible');
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoControles } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

/** Alertes de cohérence et rapprochement avec les soldes de la comptabilité Sage. */
@Component({
  selector: 'app-immo-controles-page',
  imports: [RouterLink, FormsModule, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-controles.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoControlesPage implements OnInit {
  private readonly api = inject(ImmoService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<ImmoControles | null>(null);

  annee = new Date().getFullYear();
  readonly annees = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.controles(this.annee).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  readonly acting = signal(false);
  readonly toast = signal<string | null>(null);

  /** Confirmation dans la page (une boîte de dialogue du navigateur peut être bloquée). */
  readonly confirmation = signal<'cloturer' | 'rouvrir' | null>(null);

  /** Clôture l'exercice choisi : plus aucune dotation, mise en service ni sortie jusqu'au 31/12. */
  cloturer(): void {
    if (this.acting()) return;
    this.confirmation.set(null);
    this.lancer(this.api.cloturer(this.annee), `Exercice ${this.annee} clôturé.`);
  }

  /** Rouvre le dernier exercice clôturé. */
  rouvrir(): void {
    if (this.acting()) return;
    this.confirmation.set(null);
    this.lancer(this.api.rouvrir(this.annee), `Exercice ${this.annee} rouvert.`);
  }

  private lancer(req: ReturnType<ImmoService['cloturer']>, message: string): void {
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);
    req.subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.set(message);
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Action impossible');
      },
    });
  }

  libelleNiveau(n: string): string {
    return n === 'ERREUR' ? 'Erreur' : n === 'AVERTISSEMENT' ? 'À surveiller' : 'Information';
  }

  /** Écart significatif (au-delà de l'arrondi). */
  ecart(e: number): boolean {
    return Math.abs(e) > 0.005;
  }
}

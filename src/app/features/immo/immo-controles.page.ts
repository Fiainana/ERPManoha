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

  libelleNiveau(n: string): string {
    return n === 'ERREUR' ? 'Erreur' : n === 'AVERTISSEMENT' ? 'À surveiller' : 'Information';
  }

  /** Écart significatif (au-delà de l'arrondi). */
  ecart(e: number): boolean {
    return Math.abs(e) > 0.005;
  }
}

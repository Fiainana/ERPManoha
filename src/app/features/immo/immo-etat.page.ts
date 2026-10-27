import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoEtatAnnuel } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

/** Tableau des immobilisations et amortissements d'un exercice (remplace le tableau Excel). */
@Component({
  selector: 'app-immo-etat-page',
  imports: [RouterLink, FormsModule, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-etat.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoEtatPage implements OnInit {
  private readonly api = inject(ImmoService);

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly etat = signal<ImmoEtatAnnuel | null>(null);
  /** Catégories dont le détail par bien est replié. */
  readonly repliees = signal<Set<number | null>>(new Set());

  annee = new Date().getFullYear();
  readonly annees = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.etatAnnuel(this.annee).subscribe({
      next: (e) => {
        this.etat.set(e);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  basculer(id: number | null): void {
    const s = new Set(this.repliees());
    if (!s.delete(id)) s.add(id);
    this.repliees.set(s);
  }

  exporter(format: 'pdf' | 'csv'): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.error.set(null);
    this.api.telechargerEtat(this.annee, format).subscribe({
      next: (nom) => {
        this.exporting.set(false);
        this.toast.set(`${nom} téléchargé.`);
      },
      error: (err: Error) => {
        this.exporting.set(false);
        this.error.set(err.message || 'Export impossible');
      },
    });
  }
}

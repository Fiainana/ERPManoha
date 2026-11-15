import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { AnalyseMagasin } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, PctPipe, NbPipe } from './analyse-format';

/** Rampe séquentielle bleue (une teinte, du clair au foncé) pour la carte d'affluence. */
const RAMPE = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

/**
 * Magasin et distribution (hors livraison) : canaux, ticket et panier, articles par ticket, remises,
 * affluence par jour et par heure, vendeurs, encaissements, indicateurs de stock et démarque.
 */
@Component({
  selector: 'app-analyse-magasin-page',
  imports: [NbPipe, RouterLink, DecimalPipe, AnalyseEnteteComponent, CompactPipe, PctPipe],
  templateUrl: './analyse-magasin.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseMagasinPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AnalyseMagasin | null>(null);
  readonly jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly rampe = RAMPE;

  /** Carte d'affluence : nombre de tickets par jour de semaine et par heure. */
  readonly carte = computed(() => {
    const d = this.data();
    if (!d) return null;
    const heures = d.parHeure.map((h) => h.heure);
    const max = Math.max(1, ...d.affluence.map((a) => a.nbTickets));
    const index = new Map(d.affluence.map((a) => [`${a.jour}-${a.heure}`, a]));
    const lignes = [1, 2, 3, 4, 5, 6, 7].map((j) => ({
      jour: this.jours[j - 1],
      cellules: heures.map((h) => {
        const a = index.get(`${j}-${h}`);
        const n = a?.nbTickets ?? 0;
        const pas = n === 0 ? -1 : Math.min(RAMPE.length - 1, Math.floor((n / max) * (RAMPE.length - 1) + 0.0001));
        return {
          heure: h,
          n,
          ca: a?.caHt ?? 0,
          fond: pas < 0 ? 'var(--me-bg-subtle)' : RAMPE[pas],
          texte: pas >= 3 ? '#ffffff' : '#09090b',
        };
      }),
    }));
    return { heures, lignes, max };
  });

  constructor() {
    effect(() => {
      this.periode.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.magasin().subscribe({
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

  readonly maxJour = computed(() => Math.max(1, ...(this.data()?.parJourSemaine ?? []).map((x) => x.caMoyenParJour)));
  readonly maxHeure = computed(() => Math.max(1, ...(this.data()?.parHeure ?? []).map((x) => x.nbTickets)));

  largeur(v: number, max: number): number {
    return Math.max(0, (v / max) * 100);
  }
}

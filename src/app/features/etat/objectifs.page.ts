import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ObjectifsService } from '../../core/services/objectifs.service';
import { ObjectifCommercialLigne, ObjectifCommercialResume } from '../../core/models/objectif-commercial.model';

const MOIS_LABELS = [
  '',
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

@Component({
  selector: 'app-objectifs-page',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './objectifs.page.html',
  styleUrls: ['./etat-vente.page.scss', './objectifs.page.scss'],
})
export class ObjectifsPage implements OnInit {
  private readonly api = inject(ObjectifsService);

  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly resume = signal<ObjectifCommercialResume | null>(null);

  annee = new Date().getFullYear();
  mois = new Date().getMonth() + 1;
  readonly moisLabels = MOIS_LABELS;

  /** Montants en édition locale (matricule → string input) */
  drafts: Record<string, string> = {};

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.annee, this.mois).subscribe({
      next: (r) => {
        this.resume.set(r);
        this.drafts = {};
        for (const l of r.lignes) {
          this.drafts[l.sageMatricule] =
            l.montantObjectif > 0 ? String(Math.round(l.montantObjectif)) : '';
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Impossible de charger les objectifs');
      },
    });
  }

  saveLigne(l: ObjectifCommercialLigne): void {
    const raw = (this.drafts[l.sageMatricule] ?? '').replace(/\s/g, '').replace(',', '.');
    const montant = Number(raw);
    if (!Number.isFinite(montant) || montant < 0) {
      this.error.set('Montant invalide');
      return;
    }

    this.saving.set(l.sageMatricule);
    this.error.set(null);
    this.success.set(null);
    this.api
      .upsert({
        sageMatricule: l.sageMatricule,
        annee: this.annee,
        mois: this.mois,
        montantObjectif: montant,
      })
      .subscribe({
        next: () => {
          this.saving.set(null);
          this.success.set(`Objectif enregistré · ${l.nomComplet || l.sageMatricule}`);
          this.reload();
        },
        error: (err) => {
          this.saving.set(null);
          this.error.set(err?.message || 'Enregistrement impossible');
        },
      });
  }

  clearLigne(l: ObjectifCommercialLigne): void {
    if (!l.id) {
      this.drafts[l.sageMatricule] = '';
      return;
    }
    if (!confirm(`Supprimer l'objectif de ${l.nomComplet || l.sageMatricule} ?`)) return;
    this.saving.set(l.sageMatricule);
    this.api.delete(l.id).subscribe({
      next: () => {
        this.saving.set(null);
        this.success.set('Objectif supprimé');
        this.reload();
      },
      error: (err) => {
        this.saving.set(null);
        this.error.set(err?.message || 'Suppression impossible');
      },
    });
  }

  money(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  progressWidth(pct: number): string {
    return Math.min(100, Math.max(0, pct)) + '%';
  }

  tone(pct: number): string {
    if (pct >= 100) return 'ok';
    if (pct >= 70) return 'mid';
    return 'low';
  }
}

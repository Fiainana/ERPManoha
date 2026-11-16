import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_TYPES_ABSENCE,
  RhAbsence,
  RhAbsenceDetail,
  RhDocument,
  RhMonEspace,
  rhIso,
  rhLibelleTypeAbsence,
} from '../../core/models/rh.model';
import { libelleStatutAbsence, tonAbsence, utc } from './rh-ui';

/**
 * Mes congés : solde, demandes et formulaire de demande pour tout compte ERP lié à une fiche employé.
 * Même circuit que l'espace employé : responsable du département, puis RH.
 */
@Component({
  selector: 'app-rh-mes-conges-page',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './rh-mes-conges.page.html',
  styleUrl: './rh.scss',
})
export class RhMesCongesPage implements OnInit {
  private readonly api = inject(RhService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly avertissement = signal<string | null>(null);
  readonly moi = signal<RhMonEspace | null>(null);
  readonly demandes = signal<RhAbsence[]>([]);
  readonly total = signal(0);
  readonly formOpen = signal(false);
  readonly formError = signal<string | null>(null);
  readonly detail = signal<RhAbsenceDetail | null>(null);
  readonly detailError = signal<string | null>(null);

  readonly libelleStatut = libelleStatutAbsence;
  readonly tonAbsence = tonAbsence;
  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly utc = utc;

  readonly espace = computed(() => this.moi()?.espace ?? null);
  /** Types que l'employé peut demander lui-même. */
  readonly types = computed(() => {
    const autorises = this.espace()?.regles.typesDemandables ?? [];
    return RH_TYPES_ABSENCE.filter((t) => autorises.includes(t.value));
  });

  f = this.formulaireVide();
  fichier: File | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.moi().subscribe({
      next: (m) => {
        this.moi.set(m);
        this.loading.set(false);
        if (m.lie) this.chargerDemandes();
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }

  private chargerDemandes(): void {
    this.api.mesDemandes({ pageSize: 100 }).subscribe({
      next: (p) => {
        this.demandes.set(p.items);
        this.total.set(p.total);
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  // —— Nouvelle demande ——

  ouvrirFormulaire(): void {
    this.f = this.formulaireVide();
    this.fichier = null;
    this.formError.set(null);
    this.formOpen.set(true);
  }

  /** Un congé se demande à l'avance ; une permission ou une maladie peut être déclarée après coup (30 jours). */
  dateMin(): string {
    if (this.f.type === 'Conge') return this.espace()?.regles.congeAuPlusTotLe ?? rhIso(new Date());
    if (this.f.type === 'SansSolde') return rhIso(new Date());
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return rhIso(d);
  }

  surDebut(): void {
    if (!this.f.dateFin || this.f.dateFin < this.f.dateDebut) this.f.dateFin = this.f.dateDebut;
  }

  surFichier(e: Event): void {
    const input = e.target as HTMLInputElement;
    const fichier = input.files?.[0] ?? null;
    const max = this.espace()?.regles.justificatifTailleMaxOctets ?? 5 * 1024 * 1024;
    if (fichier && fichier.size > max) {
      this.formError.set(`Justificatif trop lourd (${Math.round(max / 1024 / 1024)} Mo au plus).`);
      input.value = '';
      this.fichier = null;
      return;
    }
    this.formError.set(null);
    this.fichier = fichier;
  }

  envoyer(): void {
    if (this.acting()) return;
    if (!this.f.dateDebut || !this.f.dateFin) {
      this.formError.set('Indiquez la date de début et la date de fin.');
      return;
    }
    if (this.f.dateFin < this.f.dateDebut) {
      this.formError.set('La date de fin doit suivre la date de début.');
      return;
    }
    this.acting.set(true);
    this.formError.set(null);
    this.api
      .demander({
        type: this.f.type,
        dateDebut: this.f.dateDebut,
        dateFin: this.f.dateFin,
        debutApresMidi: this.f.debutApresMidi,
        finMatin: this.f.finMatin,
        motif: this.f.motif.trim() || null,
      })
      .subscribe({
        next: (res) => {
          const a = res.data.absence;
          const message = `Demande envoyée : ${a.nbJours} jour(s), ${this.libelleStatut(a.statut).toLowerCase()}.`;
          this.avertissement.set(
            res.data.depasseSolde ? 'Cette demande dépasse votre solde de congés : le RH décidera.' : null
          );
          if (this.fichier) {
            this.api.ajouterMonJustificatif(a.id, this.fichier).subscribe({
              next: () => this.terminer(message),
              error: (e: Error) => {
                this.terminer(message);
                this.error.set(`Demande envoyée, mais le justificatif n’a pas été joint : ${e.message}`);
              },
            });
          } else {
            this.terminer(message);
          }
        },
        error: (e: Error) => {
          this.acting.set(false);
          this.formError.set(e.message);
        },
      });
  }

  private terminer(message: string): void {
    this.acting.set(false);
    this.formOpen.set(false);
    this.toast.set(message);
    this.load();
  }

  // —— Détail d'une demande ——

  ouvrir(a: RhAbsence): void {
    this.detailError.set(null);
    this.api.maDemande(a.id).subscribe({
      next: (d) => this.detail.set(d),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  enAttente(a: RhAbsence): boolean {
    return a.statut === 'EnAttenteResponsable' || a.statut === 'EnAttenteRh';
  }

  retirer(a: RhAbsence): void {
    if (this.acting() || !confirm('Retirer cette demande ?')) return;
    this.acting.set(true);
    this.api.retirerMaDemande(a.id).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.detail.set(null);
        this.toast.set(res.message || 'Demande retirée.');
        this.load();
      },
      error: (e: Error) => {
        this.acting.set(false);
        if (this.detail()) this.detailError.set(e.message);
        else this.error.set(e.message);
      },
    });
  }

  joindre(e: Event): void {
    const d = this.detail();
    const input = e.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!d || !fichier || this.acting()) return;
    this.acting.set(true);
    this.detailError.set(null);
    this.api.ajouterMonJustificatif(d.absence.id, fichier).subscribe({
      next: () => {
        this.acting.set(false);
        input.value = '';
        this.ouvrir(d.absence);
        this.chargerDemandes();
      },
      error: (err: Error) => {
        this.acting.set(false);
        input.value = '';
        this.detailError.set(err.message);
      },
    });
  }

  voir(doc: RhDocument): void {
    this.api.telechargerMonJustificatif(doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (e: Error) => this.detailError.set(e.message),
    });
  }

  private formulaireVide() {
    return { type: 'Conge', dateDebut: '', dateFin: '', debutApresMidi: false, finMatin: false, motif: '' };
  }
}

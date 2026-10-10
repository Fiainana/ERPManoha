import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import { RhAbsenceDetail, RhDocument, rhLibelleTypeAbsence } from '../../core/models/rh.model';
import { libelleStatutAbsence, ouvrirBlob, tonAbsence, utc } from './rh-ui';

type Action = 'valider' | 'refuser' | 'annuler';

@Component({
  selector: 'app-rh-absence-detail-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './rh-absence-detail.page.html',
  styleUrl: './rh.scss',
})
export class RhAbsenceDetailPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<RhAbsenceDetail | null>(null);
  readonly action = signal<Action | null>(null);

  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly libelleStatut = libelleStatutAbsence;
  readonly tonAbsence = tonAbsence;
  readonly utc = utc;

  id = 0;
  commentaire = '';

  readonly libellesAction: Record<Action, string> = {
    valider: 'Valider la demande',
    refuser: 'Refuser la demande',
    annuler: 'Annuler l’absence',
  };

  readonly libellesHistorique: Record<string, string> = {
    Saisie: 'Saisie par le RH',
    SaisieValidee: 'Saisie et validée par le RH',
    Demande: 'Demande de l’employé',
    AvisFavorable: 'Avis favorable du responsable',
    AvisDefavorable: 'Avis défavorable du responsable',
    Validation: 'Validée',
    Refus: 'Refusée',
    Annulation: 'Annulée',
    Retrait: 'Retirée par l’employé',
  };

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.absence(this.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  get enAttente(): boolean {
    const s = this.detail()?.absence.statut;
    return s === 'EnAttenteRh' || s === 'EnAttenteResponsable';
  }

  get annulable(): boolean {
    const s = this.detail()?.absence.statut;
    return s !== 'Annulee' && s !== 'Refusee';
  }

  demander(a: Action): void {
    this.commentaire = '';
    this.action.set(a);
  }

  confirmer(): void {
    const a = this.action();
    if (!a || this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.traiterAbsence(this.id, a, this.commentaire.trim() || null).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.action.set(null);
        this.toast.set(res.message || 'Enregistré.');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.action.set(null);
        this.error.set(err.message);
      },
    });
  }

  deposer(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.ajouterDocument(this.id, fichier).subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.set('Justificatif ajouté.');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err.message);
      },
    });
  }

  voir(doc: RhDocument): void {
    this.api.telechargerDocument(doc.id).subscribe({
      next: (blob) => ouvrirBlob(blob),
      error: (err) => this.error.set(err.message),
    });
  }

  supprimerDocument(doc: RhDocument): void {
    if (!confirm(`Supprimer « ${doc.nomFichier} » ?`)) return;
    this.api.supprimerDocument(doc.id).subscribe({
      next: () => {
        this.toast.set('Justificatif supprimé.');
        this.load();
      },
      error: (err) => this.error.set(err.message),
    });
  }

  taille(octets: number): string {
    return octets > 1024 * 1024 ? (octets / 1024 / 1024).toFixed(1) + ' Mo' : Math.ceil(octets / 1024) + ' Ko';
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_TYPES_ABSENCE,
  RhAbsence,
  RhAbsenceCreation,
  RhAbsenceRequest,
  RhEmployeListItem,
  rhIso,
  rhLibelleTypeAbsence,
} from '../../core/models/rh.model';
import { libelleStatutAbsence, tonAbsence } from './rh-ui';

@Component({
  selector: 'app-rh-absences-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './rh-absences.page.html',
  styleUrl: './rh.scss',
})
export class RhAbsencesPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly items = signal<RhAbsence[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly employes = signal<RhEmployeListItem[]>([]);
  readonly formOpen = signal(false);
  readonly resultat = signal<RhAbsenceCreation | null>(null);
  readonly pageSize = 50;

  readonly types = RH_TYPES_ABSENCE;
  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly libelleStatut = libelleStatutAbsence;
  readonly tonAbsence = tonAbsence;

  statut = 'EnAttente';
  type = '';
  employeId: number | null = null;
  debut = '';
  fin = '';

  f: RhAbsenceRequest = this.vide();

  readonly statuts = [
    { value: 'EnAttente', label: 'À traiter (toutes étapes)' },
    { value: 'EnAttenteResponsable', label: 'Avis du responsable attendu' },
    { value: 'EnAttenteRh', label: 'À valider par le RH' },
    { value: 'Validee', label: 'Validées' },
    { value: 'Refusee', label: 'Refusées' },
    { value: 'Annulee', label: 'Annulées' },
    { value: '', label: 'Tous les statuts' },
  ];

  ngOnInit(): void {
    this.api.employes({ statut: 'Actif', pageSize: 200 }).subscribe({ next: (p) => this.employes.set(p.items), error: () => {} });
    const q = this.route.snapshot.queryParamMap;
    if (q.get('employeId')) {
      this.employeId = Number(q.get('employeId'));
      this.statut = '';
    }
    if (q.get('nouvelle')) {
      this.nouvelle();
      if (this.employeId) this.f.employeId = this.employeId;
    }
    this.load(1);
  }

  reload(): void {
    this.load(1);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || this.loading()) return;
    this.load(page);
  }

  ouvrir(a: RhAbsence): void {
    void this.router.navigate(['/rh/absences', a.id]);
  }

  nouvelle(): void {
    this.f = this.vide();
    this.formError.set(null);
    this.resultat.set(null);
    this.formOpen.set(true);
  }

  enregistrer(): void {
    if (this.saving()) return;
    if (!this.f.employeId || !this.f.dateDebut || !this.f.dateFin) {
      this.formError.set('Employé et dates obligatoires.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.api.creerAbsence({ ...this.f, employeId: Number(this.f.employeId), motif: this.f.motif || null }).subscribe({
      next: (res) => {
        this.saving.set(false);
        const r = res.data;
        if (r.depasseSolde || r.alertesEffectif.length) {
          this.resultat.set(r);
        } else {
          this.formOpen.set(false);
          this.toast.set(res.message || 'Absence enregistrée.');
        }
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err.message);
      },
    });
  }

  fermer(): void {
    this.formOpen.set(false);
    this.resultat.set(null);
  }

  periode(a: RhAbsence): string {
    const d = (s: string) => s.split('-').reverse().join('/');
    let txt = d(a.dateDebut) + (a.debutApresMidi ? ' (ap.-midi)' : '');
    if (a.dateFin !== a.dateDebut || a.finMatin) txt += ' → ' + d(a.dateFin) + (a.finMatin ? ' (matin)' : '');
    return txt;
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .absences({
        employeId: this.employeId,
        statut: this.statut || undefined,
        type: this.type || undefined,
        debut: this.debut || undefined,
        fin: this.fin || undefined,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (d) => {
          this.items.set(d.items ?? []);
          this.total.set(d.total ?? 0);
          this.page.set(d.page ?? page);
          this.totalPages.set(d.totalPages ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }

  private vide(): RhAbsenceRequest {
    const today = rhIso(new Date());
    return {
      employeId: 0,
      type: 'Conge',
      dateDebut: today,
      dateFin: today,
      debutApresMidi: false,
      finMatin: false,
      motif: null,
      valider: false,
    };
  }
}

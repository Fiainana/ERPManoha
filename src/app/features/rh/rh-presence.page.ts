import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_TYPES_ABSENCE,
  RhDepartement,
  RhJourPresence,
  RhPresenceDuJour,
  RhRapportPresence,
  RhSynthesePresence,
  rhDuree,
  rhIso,
  rhLibelleTypeAbsence,
} from '../../core/models/rh.model';
import { libellePresence, libelleRepos, tonPresence } from './rh-ui';

type Onglet = 'jour' | 'rapport';

@Component({
  selector: 'app-rh-presence-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './rh-presence.page.html',
  styleUrl: './rh.scss',
})
export class RhPresencePage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);

  readonly onglet = signal<Onglet>('jour');
  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly duJour = signal<RhPresenceDuJour | null>(null);
  readonly rapport = signal<RhRapportPresence | null>(null);
  readonly departements = signal<RhDepartement[]>([]);
  readonly employeChoisi = signal<number | null>(null);

  readonly justif = signal<RhJourPresence | null>(null);
  readonly pointage = signal<RhJourPresence | null>(null);
  readonly modalError = signal<string | null>(null);

  readonly types = RH_TYPES_ABSENCE;
  readonly libellePresence = libellePresence;
  readonly libelleRepos = libelleRepos;
  readonly tonPresence = tonPresence;
  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly duree = rhDuree;

  departementId: number | null = null;
  employeId: number | null = null;
  debut = rhIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fin = rhIso(new Date());
  seulementAnomalies = false;

  j = { type: 'Permission', motif: '', dateFin: '', debutApresMidi: false, finMatin: false };
  p = { heure: '17:00', motif: '' };

  readonly lignesEmploye = computed(() => {
    const r = this.rapport();
    const id = this.employeChoisi();
    if (!r || id == null) return [];
    return r.lignes.filter((l) => l.employeId === id && (!this.seulementAnomalies || this.anomalie(l)));
  });

  readonly synthese = computed<RhSynthesePresence | null>(
    () => this.rapport()?.employes.find((e) => e.employeId === this.employeChoisi()) ?? null
  );

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.api.departements().subscribe({ next: (d) => this.departements.set(d), error: () => {} });
    if (q.get('employeId')) {
      this.employeId = Number(q.get('employeId'));
      this.onglet.set('rapport');
      this.chargerRapport();
    } else {
      this.chargerJour();
    }
  }

  setOnglet(o: Onglet): void {
    this.onglet.set(o);
    if (o === 'jour') this.chargerJour();
    else if (!this.rapport()) this.chargerRapport();
  }

  actualiser(): void {
    if (this.onglet() === 'jour') this.chargerJour();
    else this.chargerRapport();
  }

  chargerJour(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.presenceDuJour(this.departementId).subscribe({
      next: (d) => {
        this.duJour.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  chargerRapport(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .rapportPresence({ debut: this.debut, fin: this.fin, departementId: this.departementId, employeId: this.employeId })
      .subscribe({
        next: (r) => {
          this.rapport.set(r);
          this.loading.set(false);
          const garde = r.employes.some((e) => e.employeId === this.employeChoisi());
          this.employeChoisi.set(garde ? this.employeChoisi() : r.employes.length === 1 ? r.employes[0].employeId : null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }

  choisirEmploye(id: number): void {
    this.employeChoisi.set(this.employeChoisi() === id ? null : id);
  }

  anomalie(l: RhJourPresence): boolean {
    return l.statut === 'Absent' || l.sortieManquante || l.retardMinutes > 0 || l.pauseDepasseeMinutes > 0;
  }

  // —— Corrections ——

  ouvrirJustif(l: RhJourPresence): void {
    this.j = { type: 'Permission', motif: '', dateFin: '', debutApresMidi: false, finMatin: false };
    this.modalError.set(null);
    this.justif.set(l);
  }

  justifier(): void {
    const l = this.justif();
    if (!l || this.acting()) return;
    this.acting.set(true);
    this.modalError.set(null);
    this.api
      .justifier({
        employeId: l.employeId,
        date: l.date,
        dateFin: this.j.dateFin || null,
        type: this.j.type,
        motif: this.j.motif.trim() || null,
        debutApresMidi: this.j.debutApresMidi,
        finMatin: this.j.finMatin,
      })
      .subscribe({
        next: (res) => {
          this.acting.set(false);
          this.justif.set(null);
          this.toast.set(res.message || 'Absence justifiée.');
          this.actualiser();
        },
        error: (err) => {
          this.acting.set(false);
          this.modalError.set(err.message);
        },
      });
  }

  ouvrirPointage(l: RhJourPresence): void {
    this.p = { heure: l.sortieManquante ? '17:00' : '08:00', motif: 'Oubli de badge' };
    this.modalError.set(null);
    this.pointage.set(l);
  }

  ajouterPointage(): void {
    const l = this.pointage();
    if (!l || this.acting()) return;
    if (!this.p.motif.trim()) {
      this.modalError.set('Motif obligatoire.');
      return;
    }
    this.acting.set(true);
    this.modalError.set(null);
    this.api.pointageManuel(l.employeId, `${l.date}T${this.p.heure}:00`, this.p.motif.trim()).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.pointage.set(null);
        this.toast.set(res.message || 'Pointage ajouté.');
        this.actualiser();
      },
      error: (err) => {
        this.acting.set(false);
        this.modalError.set(err.message);
      },
    });
  }
}

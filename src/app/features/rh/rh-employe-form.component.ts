import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RhService } from '../../core/services/rh.service';
import {
  RH_JOURS_SEMAINE,
  RhDepartement,
  RhEmploye,
  RhEmployeRequest,
  RhHoraire,
  RhPoste,
  rhIso,
} from '../../core/models/rh.model';

/** Fenêtre de création / modification d'une fiche employé. */
@Component({
  selector: 'app-rh-employe-form',
  imports: [FormsModule],
  templateUrl: './rh-employe-form.component.html',
  styleUrl: './rh.scss',
})
export class RhEmployeFormComponent implements OnInit {
  private readonly api = inject(RhService);

  /** null = nouvel employé. */
  readonly employe = input<RhEmploye | null>(null);
  readonly saved = output<number>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly departements = signal<RhDepartement[]>([]);
  readonly postes = signal<RhPoste[]>([]);
  readonly horaires = signal<RhHoraire[]>([]);
  readonly jours = RH_JOURS_SEMAINE;

  f: RhEmployeRequest = this.vide();

  ngOnInit(): void {
    const e = this.employe();
    if (e) {
      this.f = {
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        sexe: e.sexe,
        dateNaissance: e.dateNaissance,
        lieuNaissance: e.lieuNaissance,
        cin: e.cin,
        cinDate: e.cinDate,
        cinLieu: e.cinLieu,
        cnaps: e.cnaps,
        telephone: e.telephone,
        email: e.email,
        adresse: e.adresse,
        situationFamiliale: e.situationFamiliale,
        nbEnfants: e.nbEnfants,
        contactUrgence: e.contactUrgence,
        departementId: e.departementId,
        posteId: e.posteId,
        horaireId: e.horaireId,
        modeRepos: e.modeRepos,
        joursRepos: e.joursRepos ? [...e.joursRepos] : [],
        joursTravailSemaine: e.joursTravailSemaine,
        dateEmbauche: e.dateEmbauche,
        pointeuseNo: e.pointeuseNo,
        soldeCongesInitial: e.soldeCongesInitial,
        dateSoldeInitial: e.dateSoldeInitial,
        notes: e.notes,
      };
    }
    forkJoin({ d: this.api.departements(), p: this.api.postes(), h: this.api.horaires() }).subscribe({
      next: ({ d, p, h }) => {
        this.departements.set(d.filter((x) => x.actif || x.id === this.f.departementId));
        this.postes.set(p.filter((x) => x.actif || x.id === this.f.posteId));
        this.horaires.set(h.filter((x) => x.actif || x.id === this.f.horaireId));
      },
      error: (err) => this.error.set(err.message),
    });
  }

  get postesDuDepartement(): RhPoste[] {
    return this.postes().filter((p) => !p.departementId || !this.f.departementId || p.departementId === this.f.departementId);
  }

  toggleJour(iso: number): void {
    const set = new Set(this.f.joursRepos ?? []);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    this.f.joursRepos = [...set].sort();
  }

  aJour(iso: number): boolean {
    return (this.f.joursRepos ?? []).includes(iso);
  }

  submit(): void {
    if (this.saving()) return;
    if (!this.f.nom?.trim() || !this.f.dateEmbauche) {
      this.error.set('Nom et date d’embauche obligatoires.');
      return;
    }
    const corps: RhEmployeRequest = {
      ...this.f,
      joursRepos: this.f.modeRepos === 'Fixe' ? this.f.joursRepos ?? [] : null,
      nbEnfants: this.f.nbEnfants === null || (this.f.nbEnfants as unknown) === '' ? null : Number(this.f.nbEnfants),
      soldeCongesInitial: Number(this.f.soldeCongesInitial) || 0,
      joursTravailSemaine: Number(this.f.joursTravailSemaine) || 5,
    };
    for (const k of Object.keys(corps) as (keyof RhEmployeRequest)[]) {
      if ((corps[k] as unknown) === '') (corps as unknown as Record<string, unknown>)[k] = null;
    }
    this.saving.set(true);
    this.error.set(null);
    const e = this.employe();
    const req = e ? this.api.modifierEmploye(e.id, corps) : this.api.creerEmploye(corps);
    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        const data = res.data as { id?: number; employe?: { id: number } } | null;
        this.saved.emit(e?.id ?? data?.employe?.id ?? data?.id ?? 0);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.message);
      },
    });
  }

  private vide(): RhEmployeRequest {
    return {
      matricule: null,
      nom: '',
      prenom: null,
      sexe: null,
      dateNaissance: null,
      lieuNaissance: null,
      cin: null,
      cinDate: null,
      cinLieu: null,
      cnaps: null,
      telephone: null,
      email: null,
      adresse: null,
      situationFamiliale: null,
      nbEnfants: null,
      contactUrgence: null,
      departementId: null,
      posteId: null,
      horaireId: null,
      modeRepos: 'Fixe',
      joursRepos: [],
      joursTravailSemaine: 5,
      dateEmbauche: rhIso(new Date()),
      pointeuseNo: null,
      soldeCongesInitial: 0,
      dateSoldeInitial: null,
      notes: null,
    };
  }
}

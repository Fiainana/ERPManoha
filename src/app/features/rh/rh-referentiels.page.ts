import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_JOURS_SEMAINE,
  RhDepartement,
  RhHoraire,
  RhJourFerie,
  RhPoste,
  RhResponsablePossible,
  rhDuree,
} from '../../core/models/rh.model';
import { libelleJours } from './rh-ui';

type Onglet = 'departements' | 'postes' | 'horaires' | 'feries';
type Modal = 'departement' | 'poste' | 'horaire' | 'ferie' | null;

@Component({
  selector: 'app-rh-referentiels-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './rh-referentiels.page.html',
  styleUrl: './rh.scss',
})
export class RhReferentielsPage implements OnInit {
  private readonly api = inject(RhService);

  readonly onglet = signal<Onglet>('departements');
  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly modal = signal<Modal>(null);
  readonly modalError = signal<string | null>(null);

  readonly departements = signal<RhDepartement[]>([]);
  readonly responsables = signal<RhResponsablePossible[]>([]);
  readonly postes = signal<RhPoste[]>([]);
  readonly horaires = signal<RhHoraire[]>([]);
  readonly feries = signal<RhJourFerie[]>([]);

  readonly jours = RH_JOURS_SEMAINE;
  readonly libelleJours = libelleJours;
  readonly duree = rhDuree;

  annee = new Date().getFullYear();
  editId: number | null = null;
  dep = { nom: '', actif: true, responsableUserId: null as number | null, emailNotification: '' };
  poste = { intitule: '', departementId: null as number | null, actif: true };
  hor = {
    nom: '',
    heureDebut: '08:00',
    heureFin: '17:00',
    pauseMinutes: 60,
    joursTravailles: [1, 2, 3, 4, 5, 6],
    toleranceRetardMin: 10,
    parDefaut: false,
    actif: true,
  };
  ferie = { date: '', libelle: '' };

  ngOnInit(): void {
    this.chargerTout();
  }

  setOnglet(o: Onglet): void {
    this.onglet.set(o);
  }

  chargerTout(): void {
    this.loading.set(true);
    this.api.departements().subscribe({
      next: (d) => {
        this.departements.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
    this.api.responsablesPossibles().subscribe({ next: (r) => this.responsables.set(r), error: () => {} });
    this.api.postes().subscribe({ next: (p) => this.postes.set(p), error: () => {} });
    this.api.horaires().subscribe({ next: (h) => this.horaires.set(h), error: () => {} });
    this.chargerFeries();
  }

  chargerFeries(): void {
    this.api.joursFeries(this.annee).subscribe({ next: (f) => this.feries.set(f), error: (err) => this.error.set(err.message) });
  }

  // —— Départements ——

  editerDepartement(d: RhDepartement | null): void {
    this.editId = d?.id ?? null;
    this.dep = {
      nom: d?.nom ?? '',
      actif: d?.actif ?? true,
      responsableUserId: d?.responsableUserId ?? null,
      emailNotification: d?.emailNotification ?? '',
    };
    this.ouvrir('departement');
  }

  enregistrerDepartement(): void {
    if (!this.dep.nom.trim()) return this.modalError.set('Nom obligatoire.');
    this.executer(
      this.api.enregistrerDepartement(this.editId, {
        ...this.dep,
        nom: this.dep.nom.trim(),
        emailNotification: this.dep.emailNotification.trim() || null,
      }),
      'Département enregistré.'
    );
  }

  // —— Postes ——

  editerPoste(p: RhPoste | null): void {
    this.editId = p?.id ?? null;
    this.poste = { intitule: p?.intitule ?? '', departementId: p?.departementId ?? null, actif: p?.actif ?? true };
    this.ouvrir('poste');
  }

  enregistrerPoste(): void {
    if (!this.poste.intitule.trim()) return this.modalError.set('Intitulé obligatoire.');
    this.executer(this.api.enregistrerPoste(this.editId, { ...this.poste, intitule: this.poste.intitule.trim() }), 'Poste enregistré.');
  }

  // —— Horaires ——

  editerHoraire(h: RhHoraire | null): void {
    this.editId = h?.id ?? null;
    this.hor = h
      ? {
          nom: h.nom,
          heureDebut: h.heureDebut,
          heureFin: h.heureFin,
          pauseMinutes: h.pauseMinutes,
          joursTravailles: [...h.joursTravailles],
          toleranceRetardMin: h.toleranceRetardMin,
          parDefaut: h.parDefaut,
          actif: h.actif,
        }
      : {
          nom: '',
          heureDebut: '08:00',
          heureFin: '17:00',
          pauseMinutes: 60,
          joursTravailles: [1, 2, 3, 4, 5, 6],
          toleranceRetardMin: 10,
          parDefaut: false,
          actif: true,
        };
    this.ouvrir('horaire');
  }

  toggleJourHoraire(iso: number): void {
    const set = new Set(this.hor.joursTravailles);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    this.hor.joursTravailles = [...set].sort();
  }

  enregistrerHoraire(): void {
    if (!this.hor.nom.trim()) return this.modalError.set('Nom obligatoire.');
    this.executer(
      this.api.enregistrerHoraire(this.editId, {
        ...this.hor,
        nom: this.hor.nom.trim(),
        pauseMinutes: Number(this.hor.pauseMinutes) || 0,
        toleranceRetardMin: Number(this.hor.toleranceRetardMin) || 0,
      }),
      'Horaire enregistré.'
    );
  }

  // —— Jours fériés ——

  editerFerie(f: RhJourFerie | null): void {
    this.ferie = { date: f?.date ?? `${this.annee}-01-01`, libelle: f?.libelle ?? '' };
    this.ouvrir('ferie');
  }

  enregistrerFerie(): void {
    if (!this.ferie.date || !this.ferie.libelle.trim()) return this.modalError.set('Date et libellé obligatoires.');
    this.executer(this.api.enregistrerJourFerie(this.ferie.date, this.ferie.libelle.trim()), 'Jour férié enregistré.');
  }

  supprimerFerie(f: RhJourFerie): void {
    if (!confirm(`Supprimer « ${f.libelle} » (${f.date}) ?`)) return;
    this.executer(this.api.supprimerJourFerie(f.date), 'Jour férié supprimé.');
  }

  initialiserFeries(): void {
    if (!confirm(`Ajouter les jours fériés légaux de Madagascar pour ${this.annee} ?`)) return;
    this.executer(this.api.initialiserJoursFeries(this.annee), `Jours fériés ${this.annee} initialisés.`);
  }

  ouvrir(m: Modal): void {
    this.modalError.set(null);
    this.modal.set(m);
  }

  private executer(obs: ReturnType<RhService['supprimerJourFerie']>, ok: string): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.modalError.set(null);
    this.error.set(null);
    obs.subscribe({
      next: () => {
        this.acting.set(false);
        this.modal.set(null);
        this.toast.set(ok);
        this.chargerTout();
      },
      error: (err: Error) => {
        this.acting.set(false);
        if (this.modal()) this.modalError.set(err.message);
        else this.error.set(err.message);
      },
    });
  }
}

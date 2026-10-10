import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_TYPES_CONTRAT,
  RhAbsence,
  RhAjustement,
  RhContrat,
  RhEmployeDetail,
  RhPoste,
  rhIso,
  rhLibelleTypeAbsence,
} from '../../core/models/rh.model';
import { RhEmployeFormComponent } from './rh-employe-form.component';
import { libelleRegime, libelleStatutAbsence, tonAbsence, utc } from './rh-ui';

type Onglet = 'fiche' | 'contrats' | 'conges' | 'espace';

@Component({
  selector: 'app-rh-employe-detail-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, RhEmployeFormComponent],
  templateUrl: './rh-employe-detail.page.html',
  styleUrl: './rh.scss',
})
export class RhEmployeDetailPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<RhEmployeDetail | null>(null);
  readonly ajustements = signal<RhAjustement[]>([]);
  readonly absences = signal<RhAbsence[]>([]);
  readonly postes = signal<RhPoste[]>([]);
  readonly onglet = signal<Onglet>('fiche');
  readonly formOpen = signal(false);
  readonly modal = signal<'contrat' | 'sortie' | 'ajustement' | 'pin' | null>(null);

  readonly typesContrat = RH_TYPES_CONTRAT;
  readonly libelleRegime = libelleRegime;
  readonly libelleStatutAbsence = libelleStatutAbsence;
  readonly tonAbsence = tonAbsence;
  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly utc = utc;

  id = 0;
  contrat: { id: number | null; type: string; dateDebut: string; dateFin: string | null; salaireBase: number | null; posteId: number | null; notes: string | null } =
    this.contratVide();
  sortie = { dateSortie: rhIso(new Date()), motif: '' };
  ajustement = { jours: 0, motif: '', dateEffet: '' };
  pin = '';
  modalError = signal<string | null>(null);

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.postes().subscribe({ next: (p) => this.postes.set(p), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.employe(this.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
    this.api.ajustements(this.id).subscribe({ next: (a) => this.ajustements.set(a.ajustements), error: () => {} });
    this.api.absences({ employeId: this.id, pageSize: 50 }).subscribe({ next: (p) => this.absences.set(p.items), error: () => {} });
  }

  setOnglet(o: Onglet): void {
    this.onglet.set(o);
  }

  onSaved(): void {
    this.formOpen.set(false);
    this.toast.set('Fiche enregistrée.');
    this.load();
  }

  // —— Contrats ——

  nouveauContrat(): void {
    this.contrat = this.contratVide();
    this.ouvrir('contrat');
  }

  modifierContrat(c: RhContrat): void {
    this.contrat = {
      id: c.id,
      type: c.type,
      dateDebut: c.dateDebut,
      dateFin: c.dateFin,
      salaireBase: c.salaireBase,
      posteId: c.posteId,
      notes: c.notes,
    };
    this.ouvrir('contrat');
  }

  enregistrerContrat(): void {
    const { id, ...corps } = this.contrat;
    this.executer(
      this.api.enregistrerContrat(this.id, id, {
        ...corps,
        dateFin: corps.dateFin || null,
        salaireBase: corps.salaireBase === null || (corps.salaireBase as unknown) === '' ? null : Number(corps.salaireBase),
      }),
      'Contrat enregistré.'
    );
  }

  supprimerContrat(c: RhContrat): void {
    if (!confirm(`Supprimer le contrat ${c.type} du ${c.dateDebut} ?`)) return;
    this.executer(this.api.supprimerContrat(c.id), 'Contrat supprimé.');
  }

  // —— Statut ——

  enregistrerSortie(): void {
    this.executer(this.api.sortieEmploye(this.id, this.sortie.dateSortie, this.sortie.motif || null), 'Sortie enregistrée.');
  }

  changerStatut(statut: 'Actif' | 'Suspendu'): void {
    const e = this.detail()?.employe;
    const msg =
      statut === 'Suspendu'
        ? 'Suspendre cet employé ? Il ne sera plus suivi dans la présence.'
        : e?.statut === 'Sorti'
          ? 'Annuler la sortie et réactiver cet employé ?'
          : 'Réactiver cet employé ?';
    if (!confirm(msg)) return;
    this.executer(this.api.statutEmploye(this.id, statut), statut === 'Actif' ? 'Employé réactivé.' : 'Employé suspendu.');
  }

  // —— Congés ——

  nouvelAjustement(): void {
    this.ajustement = { jours: 0, motif: '', dateEffet: '' };
    this.ouvrir('ajustement');
  }

  enregistrerAjustement(): void {
    const jours = Number(this.ajustement.jours);
    if (!jours || !this.ajustement.motif.trim()) {
      this.modalError.set('Nombre de jours (différent de 0) et motif obligatoires.');
      return;
    }
    this.executer(
      this.api.ajouterAjustement(this.id, jours, this.ajustement.motif.trim(), this.ajustement.dateEffet || null),
      'Ajustement enregistré.'
    );
  }

  supprimerAjustement(a: RhAjustement): void {
    if (!confirm(`Supprimer l’ajustement de ${a.jours} j (${a.motif}) ?`)) return;
    this.executer(this.api.supprimerAjustement(a.id), 'Ajustement supprimé.');
  }

  // —— Espace employé ——

  definirPin(): void {
    if (!/^\d{4,6}$/.test(this.pin)) {
      this.modalError.set('Le PIN doit contenir 4 à 6 chiffres.');
      return;
    }
    this.executer(this.api.definirPin(this.id, this.pin), 'PIN enregistré. Communiquez-le à l’employé.');
  }

  supprimerPin(): void {
    if (!confirm('Retirer le PIN ? L’employé ne pourra plus se connecter à son espace.')) return;
    this.executer(this.api.supprimerPin(this.id), 'PIN retiré.');
  }

  ouvrir(m: 'contrat' | 'sortie' | 'ajustement' | 'pin'): void {
    this.modalError.set(null);
    this.pin = '';
    this.modal.set(m);
  }

  fermer(): void {
    this.modal.set(null);
  }

  private executer(obs: ReturnType<RhService['supprimerPin']>, ok: string): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.modalError.set(null);
    this.error.set(null);
    obs.subscribe({
      next: () => {
        this.acting.set(false);
        this.modal.set(null);
        this.toast.set(ok);
        this.load();
      },
      error: (err: Error) => {
        this.acting.set(false);
        if (this.modal()) this.modalError.set(err.message);
        else this.error.set(err.message);
      },
    });
  }

  private contratVide() {
    return {
      id: null,
      type: 'CDI',
      dateDebut: rhIso(new Date()),
      dateFin: null as string | null,
      salaireBase: null as number | null,
      posteId: null as number | null,
      notes: null as string | null,
    };
  }
}

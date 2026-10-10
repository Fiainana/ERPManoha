import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RH_JOURS_SEMAINE,
  RhDepartement,
  RhJourPlanning,
  RhPlanifierRotationResult,
  RhPlanning,
  RhPlanningEmploye,
  rhAjouterJours,
  rhIso,
  rhJourIso,
  rhLibelleTypeAbsence,
  rhLundi,
} from '../../core/models/rh.model';
import { libelleRegime } from './rh-ui';

interface CelluleChoisie {
  employe: RhPlanningEmploye;
  jour: RhJourPlanning;
}

@Component({
  selector: 'app-rh-planning-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './rh-planning.page.html',
  styleUrls: ['./rh.scss', './rh-planning.page.scss'],
})
export class RhPlanningPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly avertissements = signal<string[]>([]);
  readonly planning = signal<RhPlanning | null>(null);
  readonly departements = signal<RhDepartement[]>([]);
  readonly cellule = signal<CelluleChoisie | null>(null);

  readonly rotationOpen = signal(false);
  readonly rotationError = signal<string | null>(null);
  readonly apercu = signal<RhPlanifierRotationResult | null>(null);

  readonly jours = RH_JOURS_SEMAINE;
  readonly libelleRegime = libelleRegime;
  readonly typeAbsence = rhLibelleTypeAbsence;

  lundi = rhLundi(rhIso(new Date()));
  semaines = 2;
  departementId: number | null = null;
  employeId: number | null = null;
  motifOff = '';

  rot = {
    debut: '',
    fin: '',
    joursExclus: [] as number[],
    remplacer: false,
  };

  /** Employés en rotation à qui il manque des jours off dans les semaines à venir de la période affichée. */
  readonly aPlanifier = computed(() => {
    const p = this.planning();
    if (!p) return [];
    const aVenir = (lundi: string) => lundi > rhIso(new Date());
    return p.employes
      .map((e) => ({
        nom: e.nom,
        total: (e.semaines ?? []).filter((s) => aVenir(s.lundi)).reduce((n, s) => n + s.aPlanifier, 0),
      }))
      .filter((x) => x.total > 0);
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('employeId')) this.employeId = Number(q.get('employeId'));
    this.api.departements().subscribe({ next: (d) => this.departements.set(d), error: () => {} });
    this.load();
  }

  get fin(): string {
    return rhAjouterJours(this.lundi, this.semaines * 7 - 1);
  }

  deplacer(n: number): void {
    this.lundi = rhAjouterJours(this.lundi, n * 7);
    this.load();
  }

  aujourdhui(): void {
    this.lundi = rhLundi(rhIso(new Date()));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .planning({ debut: this.lundi, fin: this.fin, departementId: this.departementId, employeId: this.employeId })
      .subscribe({
        next: (p) => {
          this.planning.set(p);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }

  estAujourdhui(date: string): boolean {
    return date === rhIso(new Date());
  }

  estLundi(date: string): boolean {
    return rhJourIso(date) === 1;
  }

  /** Texte court d'une case du planning. */
  code(j: RhJourPlanning): string {
    switch (j.statut) {
      case 'Repos':
        return 'Repos';
      case 'JourOff':
        return 'Off';
      case 'Absence': {
        const t = this.typeAbsence(j.absence?.type);
        return j.absence?.demiJournee ? '½ ' + t : t;
      }
      case 'Ferie':
        return 'Férié';
      case 'HorsContrat':
        return '';
      default:
        return j.demandeEnAttente ? '?' : '';
    }
  }

  titre(e: RhPlanningEmploye, j: RhJourPlanning): string {
    const parts = [`${e.nom} — ${j.date.split('-').reverse().join('/')}`];
    if (j.statut === 'JourOff') parts.push(`Jour off ${j.origine === 'Auto' ? '(généré)' : '(manuel)'}`);
    if (j.statut === 'Absence') parts.push(`${this.typeAbsence(j.absence?.type)} ${j.absence?.demiJournee ? '(' + j.absence.demiJournee + ')' : ''}`);
    if (j.jourFerie) parts.push(j.jourFerie);
    if (j.demandeEnAttente) parts.push(`Demande en attente : ${this.typeAbsence(j.demandeEnAttente.type)}`);
    return parts.join('\n');
  }

  choisir(e: RhPlanningEmploye, j: RhJourPlanning): void {
    if (j.statut === 'HorsContrat' || j.statut === 'Ferie') return;
    this.motifOff = '';
    this.cellule.set({ employe: e, jour: j });
  }

  offBloque(date: string): boolean {
    return (this.planning()?.joursSansOff ?? []).includes(rhJourIso(date));
  }

  poserOff(): void {
    const c = this.cellule();
    if (!c || this.acting()) return;
    this.executer(this.api.ajouterJoursOff(c.employe.employeId, [c.jour.date], this.motifOff.trim() || null), (res) => {
      const data = res.data as { avertissements?: string[] };
      this.avertissements.set(data?.avertissements ?? []);
      this.toast.set(`Jour off posé pour ${c.employe.nom} le ${c.jour.date.split('-').reverse().join('/')}.`);
    });
  }

  retirerOff(): void {
    const c = this.cellule();
    if (!c || this.acting()) return;
    this.executer(this.api.supprimerJourOff(c.employe.employeId, c.jour.date), () => {
      this.avertissements.set([]);
      this.toast.set(`Jour off retiré pour ${c.employe.nom}.`);
    });
  }

  // —— Génération de la rotation ——

  ouvrirRotation(): void {
    const lundiCourant = rhLundi(rhIso(new Date()));
    this.rot = { debut: lundiCourant, fin: rhAjouterJours(lundiCourant, 8 * 7 - 1), joursExclus: [], remplacer: false };
    this.apercu.set(null);
    this.rotationError.set(null);
    this.rotationOpen.set(true);
  }

  toggleExclu(iso: number): void {
    const set = new Set(this.rot.joursExclus);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    this.rot.joursExclus = [...set].sort();
    this.apercu.set(null);
  }

  bloqueParParametre(iso: number): boolean {
    return (this.planning()?.joursSansOff ?? []).includes(iso);
  }

  genererRotation(simulation: boolean): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.rotationError.set(null);
    this.api
      .planifierRotation({
        debut: this.rot.debut,
        fin: this.rot.fin,
        joursExclus: this.rot.joursExclus,
        remplacer: this.rot.remplacer,
        simulation,
        departementId: this.departementId,
      })
      .subscribe({
        next: (res) => {
          this.acting.set(false);
          if (simulation) {
            this.apercu.set(res.data);
          } else {
            this.rotationOpen.set(false);
            this.avertissements.set(res.data.avertissements);
            this.toast.set(
              `Planning de rotation enregistré : ${res.data.ajoutes} jour(s) off ajouté(s)` +
                (res.data.supprimes ? `, ${res.data.supprimes} remplacé(s).` : '.')
            );
            this.load();
          }
        },
        error: (err) => {
          this.acting.set(false);
          this.rotationError.set(err.message);
        },
      });
  }

  joursOffAuto(s: RhPlanifierRotationResult['employes'][number]['semaines'][number]) {
    return s.joursOff.filter((j) => j.origine !== 'Fermeture');
  }

  private executer(
    obs: ReturnType<RhService['supprimerJourOff']>,
    ok: (res: { data: unknown; message: string | null }) => void
  ): void {
    this.acting.set(true);
    this.error.set(null);
    obs.subscribe({
      next: (res) => {
        this.acting.set(false);
        this.cellule.set(null);
        ok(res);
        this.load();
      },
      error: (err: Error) => {
        this.acting.set(false);
        this.cellule.set(null);
        this.error.set(err.message);
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import {
  RhEmployeListItem,
  RhPersonnePointeuse,
  RhPointage,
  RhStatutPointeuse,
  rhAjouterJours,
  rhIso,
} from '../../core/models/rh.model';
import { utc } from './rh-ui';

type Onglet = 'pointages' | 'personnes';

@Component({
  selector: 'app-rh-pointeuse-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './rh-pointeuse.page.html',
  styleUrl: './rh.scss',
})
export class RhPointeusePage implements OnInit {
  private readonly api = inject(RhService);

  readonly onglet = signal<Onglet>('pointages');
  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly statut = signal<RhStatutPointeuse | null>(null);
  readonly items = signal<RhPointage[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly personnes = signal<RhPersonnePointeuse[]>([]);
  readonly employes = signal<RhEmployeListItem[]>([]);
  readonly modal = signal<'manuel' | 'ignorer' | 'synchro' | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly pageSize = 100;

  readonly utc = utc;

  dateDebut = rhAjouterJours(rhIso(new Date()), -6);
  dateFin = rhIso(new Date());
  search = '';

  manuel = { employeId: 0, date: rhIso(new Date()), heure: '08:00', motif: 'Oubli de badge' };
  cible: RhPointage | null = null;
  motifIgnore = '';
  depuis = '';

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.chargerStatut();
    this.load(1);
    this.api.employes({ statut: 'Actif', pageSize: 200 }).subscribe({
      next: (p) => this.employes.set(p.items.filter((e) => !!e.pointeuseNo)),
      error: () => {},
    });
  }

  setOnglet(o: Onglet): void {
    this.onglet.set(o);
    if (o === 'personnes') this.chargerPersonnes();
  }

  chargerStatut(): void {
    this.api.statutPointeuse().subscribe({ next: (s) => this.statut.set(s), error: () => this.statut.set(null) });
  }

  chargerPersonnes(): void {
    this.api.personnesPointeuse().subscribe({
      next: (p) => this.personnes.set(p),
      error: (err) => this.error.set(err.message),
    });
  }

  onSearch(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  reload(): void {
    this.load(1);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || this.loading()) return;
    this.load(page);
  }

  // —— Synchronisation ——

  ouvrirSynchro(): void {
    this.depuis = '';
    this.ouvrir('synchro');
  }

  synchroniser(): void {
    this.executer(this.api.synchroniser(this.depuis || null), (msg) => {
      this.toast.set(msg || 'Synchronisation terminée.');
      this.chargerStatut();
    });
  }

  // —— Corrections ——

  ouvrirManuel(): void {
    this.manuel = { employeId: 0, date: rhIso(new Date()), heure: '08:00', motif: 'Oubli de badge' };
    this.ouvrir('manuel');
  }

  ajouterManuel(): void {
    if (!this.manuel.employeId || !this.manuel.motif.trim()) {
      this.modalError.set('Employé et motif obligatoires.');
      return;
    }
    this.executer(
      this.api.pointageManuel(Number(this.manuel.employeId), `${this.manuel.date}T${this.manuel.heure}:00`, this.manuel.motif.trim()),
      (msg) => this.toast.set(msg || 'Pointage ajouté.')
    );
  }

  ouvrirIgnorer(p: RhPointage): void {
    this.cible = p;
    this.motifIgnore = '';
    this.ouvrir('ignorer');
  }

  ignorer(): void {
    if (!this.cible || !this.motifIgnore.trim()) {
      this.modalError.set('Motif obligatoire.');
      return;
    }
    this.executer(this.api.ignorerPointage(this.cible.id, this.motifIgnore.trim()), (msg) =>
      this.toast.set(msg || 'Pointage écarté.')
    );
  }

  retablir(p: RhPointage): void {
    this.executer(this.api.retablirPointage(p.id), (msg) => this.toast.set(msg || 'Pointage rétabli.'));
  }

  importer(p: RhPersonnePointeuse): void {
    this.executer(this.api.importerPointeuse([p.employeNo]), (msg) => {
      this.toast.set(msg || 'Fiche créée.');
      this.chargerPersonnes();
    });
  }

  ouvrir(m: 'manuel' | 'ignorer' | 'synchro'): void {
    this.modalError.set(null);
    this.modal.set(m);
  }

  private executer(obs: ReturnType<RhService['retablirPointage']>, ok: (message: string | null) => void): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.modalError.set(null);
    this.error.set(null);
    obs.subscribe({
      next: (res) => {
        this.acting.set(false);
        this.modal.set(null);
        ok(res.message);
        this.load(this.page());
      },
      error: (err: Error) => {
        this.acting.set(false);
        if (this.modal()) this.modalError.set(err.message);
        else this.error.set(err.message);
      },
    });
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .pointages({
        dateDebut: this.dateDebut || undefined,
        dateFin: this.dateFin || undefined,
        search: this.search.trim() || undefined,
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
}

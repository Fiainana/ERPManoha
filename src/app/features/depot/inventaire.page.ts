import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventairesService } from '../../core/services/inventaires.service';
import { AuthService } from '../../core/services/auth.service';
import { InventaireListItem } from '../../core/models/inventaire.model';

@Component({
  selector: 'app-inventaire-page',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './inventaire.page.html',
  styleUrl: './inventaire.page.scss',
})
export class InventairePage implements OnInit {
  private readonly api = inject(InventairesService);
  readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly items = signal<InventaireListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly pageSize = 40;

  /** Par défaut : ce qu'il reste à faire (comptage dépôt / validation admin). */
  statut = '';

  readonly statuts = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Brouillon', label: 'À compter' },
    { value: 'Soumis', label: 'À valider (admin)' },
    { value: 'Valide', label: 'Validés' },
    { value: 'Annule', label: 'Annulés' },
  ];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.load(1);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || this.loading()) return;
    this.load(page);
  }

  genererHebdo(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.genererHebdo().subscribe({
      next: (res) => {
        this.acting.set(false);
        const depots = ((res as { depots?: { cree: boolean }[] })?.depots ?? []);
        const crees = depots.filter((d) => d.cree).length;
        this.toast.set(
          crees > 0
            ? `${crees} inventaire(s) hebdomadaire(s) généré(s).`
            : 'Inventaire de la semaine déjà généré.'
        );
        this.reload();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Génération impossible');
      },
    });
  }

  /** Dates API stockées en UTC (SYSUTCDATETIME) sans fuseau. */
  utc(d: string | null): string | null {
    if (!d) return null;
    return /[zZ]|[+-]\d\d:\d\d$/.test(d) ? d : d + 'Z';
  }

  libelleStatut(s: string): string {
    switch (s) {
      case 'Brouillon':
        return 'À compter';
      case 'Soumis':
        return 'À valider';
      case 'Valide':
        return 'Validé';
      case 'Annule':
        return 'Annulé';
      default:
        return s;
    }
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({ statut: this.statut || undefined, page, pageSize: this.pageSize })
      .subscribe({
        next: (data) => {
          this.items.set(data.items ?? []);
          this.total.set(data.total ?? 0);
          this.page.set(data.page ?? page);
          this.totalPages.set(data.totalPages ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.message || 'Erreur chargement');
        },
      });
  }
}

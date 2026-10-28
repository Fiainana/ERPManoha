import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { FacturesService } from '../../core/services/factures.service';
import { IMMO_STATUTS, ImmoFiche, ImmoSyncResultat, libelleStatutImmo } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

@Component({
  selector: 'app-immo-fiches-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-fiches.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoFichesPage implements OnInit {
  private readonly api = inject(ImmoService);
  private readonly factures = inject(FacturesService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly fiches = signal<ImmoFiche[]>([]);

  statut = '';
  search = '';
  readonly statuts = [{ value: '', label: 'Tous les statuts' }, ...IMMO_STATUTS];
  readonly libelleStatut = libelleStatutImmo;

  readonly filtrees = computed(() => {
    const q = this.search.trim().toLowerCase();
    const list = this.fiches();
    if (!q) return list;
    return list.filter((f) =>
      [f.numeroInventaire, f.designation, f.categorieLibelle, f.site, f.numeroSerie, f.pieceSage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  });
  readonly totalValeur = computed(() => this.filtrees().reduce((s, f) => s + (f.valeurBrute || 0), 0));
  readonly aValider = computed(() => this.fiches().filter((f) => f.statut === 'A_VALIDER').length);

  // Synchronisation des achats Sage
  readonly syncOuvert = signal(false);
  readonly sync = signal<ImmoSyncResultat | null>(null);
  depuis = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.fiches(this.statut || undefined).subscribe({
      next: (data) => {
        this.fiches.set(data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  rechercher(): void {
    // Force le recalcul de `filtrees` (la recherche est un champ ngModel, pas un signal).
    this.fiches.set([...this.fiches()]);
  }

  basculerSync(): void {
    this.syncOuvert.set(!this.syncOuvert());
    if (this.syncOuvert() && !this.sync()) this.lancerSync(true);
  }

  lancerSync(apercu: boolean): void {
    if (this.acting()) return;
    if (!apercu && !confirm('Importer les achats Sage et créer les fiches d’immobilisation ?')) return;
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);
    this.api.syncAchats({ apercu, depuis: this.depuis || undefined }).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.sync.set(res);
        if (!apercu) {
          this.toast.set(
            res.fichesCreees > 0 ? `${res.fichesCreees} fiche(s) créée(s).` : 'Aucune nouvelle fiche à créer.'
          );
          this.reload();
        }
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Synchronisation impossible');
      },
    });
  }

  /** Fiches qui seraient créées (aperçu) : somme des fiches prévues par ligne. */
  aCreer(s: ImmoSyncResultat): number {
    return s.lignes.reduce((n, l) => n + (l.nbFiches || 0), 0);
  }

  readonly impression = signal(false);

  /**
   * Imprime les étiquettes (QR code) des biens affichés : une étiquette par page pour l'imprimante d'étiquettes,
   * ou une planche A4 de 21 étiquettes.
   */
  imprimerEtiquettes(layout: 'rouleau' | 'planche'): void {
    const ids = this.filtrees()
      .filter((f) => f.statut !== 'REJETEE')
      .map((f) => f.id);
    if (ids.length === 0 || this.impression()) return;
    if (ids.length > 500) {
      this.error.set('500 étiquettes au plus par impression : filtrez la liste.');
      return;
    }
    if (ids.length > 1 && !confirm(`Imprimer ${ids.length} étiquettes ?`)) return;
    this.impression.set(true);
    this.error.set(null);
    this.api.etiquettes(ids, layout).subscribe({
      next: (pdf) => {
        this.impression.set(false);
        this.factures.imprimerDirect(pdf);
      },
      error: (err: Error) => {
        this.impression.set(false);
        this.error.set(err.message || 'Impression impossible');
      },
    });
  }

  libelleResultat(r: string): string {
    switch (r) {
      case 'A_IMPORTER':
        return 'À importer';
      case 'IMPORTEE':
        return 'Importée';
      case 'SOUS_SEUIL':
        return 'Sous le seuil (charge)';
      default:
        return r;
    }
  }
}

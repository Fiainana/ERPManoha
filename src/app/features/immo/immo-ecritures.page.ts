import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoEcriture, libelleStatutEcriture, libelleTypeEcriture } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

/** File des écritures à passer dans Sage (dotations, mises en service, cessions, rebuts). */
@Component({
  selector: 'app-immo-ecritures-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe, ImmoTabsComponent],
  templateUrl: './immo-ecritures.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoEcrituresPage implements OnInit {
  private readonly api = inject(ImmoService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly items = signal<ImmoEcriture[]>([]);
  readonly ouverte = signal<number | null>(null);

  statut = '';
  readonly statuts = [
    { value: '', label: 'Tous les statuts' },
    { value: 'A_EXPORTER', label: 'À exporter' },
    { value: 'ERREUR', label: 'En erreur' },
    { value: 'EXPORTEE', label: 'Exportées' },
    { value: 'ANNULEE', label: 'Annulées' },
  ];

  readonly libelleType = libelleTypeEcriture;
  readonly libelleStatut = libelleStatutEcriture;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.ecritures(this.statut || undefined).subscribe({
      next: (data) => {
        this.items.set(data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  nbAExporter(): number {
    return this.items().filter((e) => e.statut === 'A_EXPORTER' || e.statut === 'ERREUR').length;
  }

  basculer(id: number): void {
    this.ouverte.set(this.ouverte() === id ? null : id);
  }

  /** Saisie en ligne (motif d'annulation ou nouveau journal) : une boîte de dialogue du navigateur peut être bloquée. */
  readonly saisie = signal<{ id: number; type: 'annuler' | 'journal' } | null>(null);
  texte = '';
  readonly confirmerExport = signal(false);

  ouvrirSaisie(e: ImmoEcriture, type: 'annuler' | 'journal'): void {
    this.saisie.set({ id: e.id, type });
    this.texte = type === 'journal' ? e.journal : '';
    this.error.set(null);
  }

  fermerSaisie(): void {
    this.saisie.set(null);
  }

  /** Annule une écriture pas encore dans Sage ; les dotations ou la sortie qu'elle réservait sont libérées. */
  annuler(e: ImmoEcriture): void {
    const motif = this.texte.trim();
    if (this.acting() || !motif) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.annulerEcriture(e.id, motif).subscribe({
      next: () => {
        this.acting.set(false);
        this.saisie.set(null);
        this.toast.set(`Écriture ${e.numeroPiece} annulée.`);
        this.ouverte.set(null);
        this.reload();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Annulation impossible');
      },
    });
  }

  /** Change le journal d'une écriture en erreur ou à exporter (ex. journal absent de Sage). */
  changerJournal(e: ImmoEcriture): void {
    const journal = this.texte.trim();
    if (this.acting() || !journal || journal === e.journal) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.changerJournal(e.id, journal).subscribe({
      next: () => {
        this.acting.set(false);
        this.saisie.set(null);
        this.toast.set(`Journal de ${e.numeroPiece} modifié.`);
        this.reload();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Modification impossible');
      },
    });
  }

  exporter(id?: number): void {
    if (this.acting()) return;
    this.confirmerExport.set(false);
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);
    this.api.exporter(id).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.toast.set(
          r.reportees > 0
            ? `${r.reportees} écriture(s) reportée(s) : sessions Sage occupées, relancez.`
            : `${r.exportees} exportée(s), ${r.enErreur} en erreur.`
        );
        this.reload();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Export impossible');
      },
    });
  }
}

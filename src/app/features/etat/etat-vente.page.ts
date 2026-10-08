import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EtatVenteService } from '../../core/services/etat-vente.service';
import { EtatVenteItem, EtatVenteResult, EtatVenteScope } from '../../core/models/etat-vente.model';

@Component({
  selector: 'app-etat-vente-page',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './etat-vente.page.html',
  styleUrl: './etat-vente.page.scss',
})
export class EtatVentePage implements OnInit {
  private readonly api = inject(EtatVenteService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<EtatVenteResult | null>(null);

  scope: EtatVenteScope = 'comptoir';
  dateDebut = this.todayIso();
  dateFin = this.todayIso();

  get scopeLabel(): string {
    if (this.scope === 'comptoir') return 'Comptoir';
    if (this.scope === 'b2b') return 'B2B';
    return 'Consolidé';
  }

  get subtitle(): string {
    if (this.scope === 'comptoir') return 'Factures de vente du client comptoir sur la période';
    if (this.scope === 'b2b') return 'Factures de vente B2B (hors client comptoir) sur la période';
    return 'Toutes les factures de vente (comptoir + B2B) sur la période';
  }

  ngOnInit(): void {
    const s = (this.route.snapshot.data['scope'] as string) || 'comptoir';
    if (s === 'b2b') this.scope = 'b2b';
    else if (s === 'tous') this.scope = 'tous';
    else this.scope = 'comptoir';
    this.reload();
  }

  reload(): void {
    if (!this.dateDebut || !this.dateFin) {
      this.error.set('Choisissez une période.');
      return;
    }
    if (this.dateFin < this.dateDebut) {
      this.error.set('La date de fin doit être ≥ date de début.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.getListe(this.scope, this.dateDebut, this.dateFin).subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.result.set(null);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }

  exportPdf(): void {
    if (!this.dateDebut || this.exporting()) return;
    this.exporting.set(true);
    this.error.set(null);
    this.api.downloadPdf(this.scope, this.dateDebut, this.dateFin).subscribe({
      next: () => this.exporting.set(false),
      error: (err) => {
        this.exporting.set(false);
        this.error.set(err?.message || 'Erreur export PDF');
      },
    });
  }

  exportExcel(): void {
    if (!this.dateDebut || this.exporting()) return;
    this.exporting.set(true);
    this.error.set(null);
    this.api.downloadExcel(this.scope, this.dateDebut, this.dateFin).subscribe({
      next: () => this.exporting.set(false),
      error: (err) => {
        this.exporting.set(false);
        this.error.set(err?.message || 'Erreur export Excel');
      },
    });
  }

  clientLabel(it: EtatVenteItem): string {
    return it.clientAffiche || it.nomClient || it.clientIntitule || it.clientNumero || '—';
  }

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}

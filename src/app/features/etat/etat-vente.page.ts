import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EtatVenteService } from '../../core/services/etat-vente.service';
import { EtatVenteItem, EtatVenteResult, EtatVenteScope } from '../../core/models/etat-vente.model';

@Component({
  selector: 'app-etat-vente-page',
  imports: [FormsModule, DatePipe, DecimalPipe],
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
  date = this.todayIso();

  get scopeLabel(): string {
    return this.scope === 'comptoir' ? 'Comptoir' : 'B2B';
  }

  get subtitle(): string {
    return this.scope === 'comptoir'
      ? 'Factures de vente du client comptoir pour la journée'
      : 'Factures de vente B2B (hors client comptoir) pour la journée';
  }

  ngOnInit(): void {
    const s = (this.route.snapshot.data['scope'] as string) || 'comptoir';
    this.scope = s === 'b2b' ? 'b2b' : 'comptoir';
    this.reload();
  }

  reload(): void {
    if (!this.date) {
      this.error.set('Choisissez une date.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.getListe(this.scope, this.date).subscribe({
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
    if (!this.date || this.exporting()) return;
    this.exporting.set(true);
    this.error.set(null);
    this.api.downloadPdf(this.scope, this.date).subscribe({
      next: () => this.exporting.set(false),
      error: (err) => {
        this.exporting.set(false);
        this.error.set(err?.message || 'Erreur export PDF');
      },
    });
  }

  clientLabel(it: EtatVenteItem): string {
    return (
      it.clientAffiche ||
      it.nomClient ||
      it.clientIntitule ||
      it.clientNumero ||
      '—'
    );
  }

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}

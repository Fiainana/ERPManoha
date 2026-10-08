import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtatVenteService } from '../../core/services/etat-vente.service';
import { JournalCaisseResult } from '../../core/models/etat-vente.model';

@Component({
  selector: 'app-journal-caisse-page',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './journal-caisse.page.html',
  styleUrl: './etat-vente.page.scss',
})
export class JournalCaissePage implements OnInit {
  private readonly api = inject(EtatVenteService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<JournalCaisseResult | null>(null);

  date = this.todayIso();
  comptoirUniquement = true;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.date) {
      this.error.set('Choisissez une date.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.getJournalCaisse(this.date, this.comptoirUniquement).subscribe({
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

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}

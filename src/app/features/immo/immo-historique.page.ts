import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ImmoService } from '../../core/services/immo.service';
import { ImmoHistorique, libelleActionImmo } from '../../core/models/immo.model';
import { ImmoTabsComponent } from './immo-tabs.component';

/** Journal des actions du module : qui a fait quoi, et quand. */
@Component({
  selector: 'app-immo-historique-page',
  imports: [RouterLink, DatePipe, ImmoTabsComponent],
  templateUrl: './immo-historique.page.html',
  styleUrl: './immo.shared.scss',
})
export class ImmoHistoriquePage implements OnInit {
  private readonly api = inject(ImmoService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<ImmoHistorique[]>([]);
  readonly libelle = libelleActionImmo;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.historique(undefined, 200).subscribe({
      next: (d) => {
        this.items.set(d ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Erreur chargement');
      },
    });
  }
}

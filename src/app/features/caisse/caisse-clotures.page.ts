import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CaisseService } from '../../core/services/caisse.service';
import { ClotureListe, ClotureListeItem, LIBELLES_STATUT_CLOTURE } from '../../core/models/caisse.model';
import { ajouterJours, aujourdhuiIso, ouvrirPdf } from './caisse-commun';

/** Historique des clôtures : statut, écarts, versements, et journées encore non clôturées. */
@Component({
  selector: 'app-caisse-clotures-page',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './caisse-clotures.page.html',
  styleUrls: ['../rh/rh.scss', './caisse.scss'],
})
export class CaisseCloturesPage implements OnInit {
  private readonly api = inject(CaisseService);
  private readonly router = inject(Router);

  readonly statuts = LIBELLES_STATUT_CLOTURE;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<ClotureListe | null>(null);
  readonly filtre = signal<'tous' | 'aVerser' | 'nonCloturees' | 'ecarts'>('tous');

  fin = aujourdhuiIso();
  debut = ajouterJours(this.fin, -29);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    if (!this.debut || !this.fin) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.liste(this.debut, this.fin).subscribe({
      next: (r) => {
        this.data.set(r.data);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }

  items(): ClotureListeItem[] {
    const items = this.data()?.items ?? [];
    switch (this.filtre()) {
      case 'aVerser':
        return items.filter((i) => i.statut === 'Cloturee');
      case 'nonCloturees':
        return items.filter((i) => i.statut === 'NonCloturee' || i.statut === 'Rouverte');
      case 'ecarts':
        return items.filter((i) => Math.abs(i.ecart ?? 0) >= 0.5 || Math.abs(i.ecartVersement ?? 0) >= 0.5 || i.modifieDansSage);
      default:
        return items;
    }
  }

  ouvrir(i: ClotureListeItem): void {
    void this.router.navigate(['/caisse/cloture'], { queryParams: { jour: i.jour } });
  }

  imprimer(i: ClotureListeItem, e: Event): void {
    e.stopPropagation();
    ouvrirPdf(this.api.pdf(i.jour), (m) => this.error.set(m));
  }
}

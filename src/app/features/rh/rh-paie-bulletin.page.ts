import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RhService } from '../../core/services/rh.service';
import { PaieBulletin } from '../../core/models/rh.model';
import { rhDuree } from '../../core/models/rh.model';

/** Bulletin de paie d'un employé : lecture, impression, validation. */
@Component({
  selector: 'app-rh-paie-bulletin-page',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './rh-paie-bulletin.page.html',
  styleUrl: './rh.scss',
})
export class RhPaieBulletinPage implements OnInit {
  private readonly api = inject(RhService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly bulletin = signal<PaieBulletin | null>(null);
  readonly duree = rhDuree;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.error.set(null);
    this.api.paieBulletin(id).subscribe({
      next: (b) => {
        this.bulletin.set(b);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  imprimer(): void {
    window.print();
  }

  valider(): void {
    const b = this.bulletin();
    if (!b || this.acting()) return;
    if (!confirm('Valider ce bulletin ? Il ne sera plus recalculé.')) return;
    this.agir(this.api.paieValiderBulletin(b.id, b.mois), 'Bulletin validé.');
  }

  rouvrir(): void {
    const b = this.bulletin();
    if (!b || this.acting()) return;
    if (!confirm('Rouvrir ce bulletin en brouillon ? Il pourra être recalculé.')) return;
    this.agir(this.api.paieRouvrirBulletin(b.id), 'Bulletin rouvert.');
  }

  libelleMois(mois: string): string {
    const [y, m] = mois.split('-').map(Number);
    const texte = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  private agir(obs: ReturnType<RhService['paieRouvrirBulletin']>, ok: string): void {
    this.acting.set(true);
    this.error.set(null);
    obs.subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.set(ok);
        this.charger();
      },
      error: (err: Error) => {
        this.acting.set(false);
        this.error.set(err.message);
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BonsRetourService } from '../../core/services/bons-retour.service';
import { BonRetourDetail } from '../../core/models/bon-retour.model';

@Component({
  selector: 'app-bon-retour-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './bon-retour-detail.page.html',
  styleUrl: './bon-retour-detail.page.scss',
})
export class BonRetourDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BonsRetourService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<BonRetourDetail | null>(null);

  private piece = '';

  ngOnInit(): void {
    this.piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!this.piece) {
      void this.router.navigate(['/depot/bons-retour']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.piece).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Bon de retour introuvable');
      },
    });
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  valider(): void {
    if (this.acting()) return;
    if (!confirm(`Valider le retour ${this.piece} et générer la facture de retour ?`)) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.valider(this.piece).subscribe({
      next: (fa) => {
        this.acting.set(false);
        if (fa) {
          void this.router.navigate(['/vente/factures', fa]);
        } else {
          this.toast.set('Retour validé');
          void this.router.navigate(['/depot/bons-retour']);
        }
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Validation impossible');
      },
    });
  }
}

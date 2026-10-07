import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { BonsRetourService } from '../../core/services/bons-retour.service';
import { BonRetourDetail } from '../../core/models/bon-retour.model';
import { AuthService } from '../../core/services/auth.service';

/** Détail d'une facture de retour (lecture seule) : facture d'origine + articles repris. */
@Component({
  selector: 'app-facture-retour-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './facture-retour-detail.page.html',
  styleUrl: './bon-retour-detail.page.scss',
})
export class FactureRetourDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BonsRetourService);
  readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detail = signal<BonRetourDetail | null>(null);

  ngOnInit(): void {
    const piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!piece) {
      void this.router.navigate(['/depot/factures-retour']);
      return;
    }

    this.loading.set(true);
    this.api.getFactureRetour(piece).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Facture de retour introuvable');
      },
    });
  }

  /** Les montants et quantités d'une facture de retour sont négatifs dans Sage. */
  abs(n: number | null | undefined): number | null {
    return n == null ? null : Math.abs(n);
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }
}

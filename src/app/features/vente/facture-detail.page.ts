import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FacturesService } from '../../core/services/factures.service';
import { AuthService } from '../../core/services/auth.service';
import { FactureDetail } from '../../core/models/facture.model';

@Component({
  selector: 'app-facture-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './facture-detail.page.html',
  styleUrl: './facture-detail.page.scss',
})
export class FactureDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FacturesService);
  readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<FactureDetail | null>(null);

  private piece = '';

  ngOnInit(): void {
    this.piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!this.piece) {
      void this.router.navigate(['/vente/factures']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getByPiece(this.piece).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Facture introuvable');
      },
    });
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  downloadPdf(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.downloadPdf(this.piece).subscribe({
      next: () => {
        this.acting.set(false);
        this.showToast('PDF téléchargé');
        // recharger pour éventuel flag dejaImprimee
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Export PDF impossible');
      },
    });
  }

  imprimer(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.getPdf(this.piece).subscribe({
      next: ({ blob }) => {
        this.api.openPrint(blob);
        this.acting.set(false);
        this.showToast('Impression lancée');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Impression impossible');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2800);
  }
}

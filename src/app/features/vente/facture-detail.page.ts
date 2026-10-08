import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturesService, FormatImpressionFacture } from '../../core/services/factures.service';
import { AuthService } from '../../core/services/auth.service';
import { FactureDetail } from '../../core/models/facture.model';

@Component({
  selector: 'app-facture-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
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
  readonly retourOpen = signal(false);
  readonly impressionOpen = signal(false);

  rfid = '';
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

  ouvrirImpression(): void {
    this.error.set(null);
    this.impressionOpen.set(true);
  }

  fermerImpression(): void {
    if (this.acting()) return;
    this.impressionOpen.set(false);
  }

  /** Génère le document et ouvre directement la boîte d'impression (pas de téléchargement). */
  imprimer(format: FormatImpressionFacture): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.getPdf(this.piece, format).subscribe({
      next: ({ blob }) => {
        this.api.imprimerDirect(blob);
        this.acting.set(false);
        this.impressionOpen.set(false);
        this.showToast(format === 'tva' ? 'Impression avec TVA lancée' : 'Impression sans TVA (2 exemplaires) lancée');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.impressionOpen.set(false);
        this.error.set(err?.message || 'Impression impossible');
      },
    });
  }

  openRetour(): void {
    this.rfid = '';
    this.retourOpen.set(true);
  }

  closeRetour(): void {
    if (this.acting()) return;
    this.retourOpen.set(false);
  }

  confirmerRetour(): void {
    if (this.acting()) return;
    const badge = this.rfid.trim();
    if (!badge) {
      this.error.set('Badge RFID du responsable obligatoire.');
      return;
    }
    this.acting.set(true);
    this.error.set(null);
    this.api.versBonRetour(this.piece, badge).subscribe({
      next: (br) => {
        this.acting.set(false);
        this.retourOpen.set(false);
        if (br) {
          void this.router.navigate(['/depot/bons-retour', br]);
        } else {
          this.showToast('Bon de retour créé');
          void this.router.navigate(['/depot/bons-retour']);
        }
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Transformation impossible');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2800);
  }
}

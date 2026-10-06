import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevisService } from '../../core/services/devis.service';
import { DevisDetail } from '../../core/models/devis.model';

@Component({
  selector: 'app-devis-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './devis-detail.page.html',
  styleUrl: './devis-detail.page.scss',
})
export class DevisDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DevisService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<DevisDetail | null>(null);
  readonly emailOpen = signal(false);

  emailTo = '';
  emailCc = '';
  emailMessage = '';

  private piece = '';

  ngOnInit(): void {
    this.piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!this.piece) {
      void this.router.navigate(['/vente/devis']);
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
        this.error.set(err?.message || 'Devis introuvable');
      },
    });
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return (
      new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar'
    );
  }

  downloadPdf(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.downloadPdf(this.piece).subscribe({
      next: () => {
        this.acting.set(false);
        this.showToast('PDF téléchargé');
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Export PDF impossible');
      },
    });
  }

  openEmail(): void {
    this.emailTo = '';
    this.emailCc = '';
    this.emailMessage = '';
    this.emailOpen.set(true);
  }

  closeEmail(): void {
    if (this.acting()) return;
    this.emailOpen.set(false);
  }

  sendEmail(): void {
    if (this.acting()) return;
    const to = this.emailTo
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const cc = this.emailCc
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    this.acting.set(true);
    this.error.set(null);
    this.api
      .envoyerEmail(this.piece, {
        to: to.length ? to : undefined,
        cc: cc.length ? cc : undefined,
        message: this.emailMessage.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.acting.set(false);
          this.emailOpen.set(false);
          this.showToast('Devis envoyé par email');
        },
        error: (err) => {
          this.acting.set(false);
          this.error.set(err?.message || 'Envoi email impossible');
        },
      });
  }

  facturer(): void {
    if (this.acting()) return;
    if (!confirm(`Transformer le devis ${this.piece} en facture ?`)) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.facturer(this.piece).subscribe({
      next: () => {
        this.acting.set(false);
        this.showToast('Devis transformé en facture');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Transformation impossible');
      },
    });
  }

  annuler(): void {
    if (this.acting()) return;
    if (!confirm(`Annuler le devis ${this.piece} ?`)) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.cancel(this.piece).subscribe({
      next: () => {
        this.acting.set(false);
        this.showToast('Devis annulé');
        void this.router.navigate(['/vente/devis']);
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Annulation impossible');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2800);
  }
}

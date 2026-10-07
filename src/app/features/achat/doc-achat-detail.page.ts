import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminAchatsService } from '../../core/services/admin-achats.service';
import { BcAchatDetail } from '../../core/models/bc-achat.model';

export type DocAchatKind = 'commandes' | 'receptions' | 'factures' | 'preparations';

@Component({
  selector: 'app-doc-achat-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './doc-achat-detail.page.html',
  styleUrl: './doc-achat-detail.page.scss',
})
export class DocAchatDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminAchatsService);

  /** Injecté via data de route ou dérivé du path */
  kind: DocAchatKind = 'commandes';
  listPath = '/achat/bc-achat';
  titleLabel = 'BC';

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly item = signal<BcAchatDetail | null>(null);

  private piece = '';

  ngOnInit(): void {
    const data = this.route.snapshot.data as {
      kind?: DocAchatKind;
      listPath?: string;
      titleLabel?: string;
    };
    if (data.kind) this.kind = data.kind;
    if (data.listPath) this.listPath = data.listPath;
    if (data.titleLabel) this.titleLabel = data.titleLabel;

    this.piece = this.route.snapshot.paramMap.get('piece') || '';
    if (!this.piece) {
      void this.router.navigate([this.listPath]);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const req =
      this.kind === 'receptions'
        ? this.api.getReception(this.piece)
        : this.kind === 'factures'
          ? this.api.getFacture(this.piece)
          : this.kind === 'preparations'
            ? this.api.getPreparation(this.piece)
            : this.api.getCommande(this.piece);

    req.subscribe({
      next: (d) => {
        this.item.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Document introuvable');
      },
    });
  }

  canFacturer(): boolean {
    return this.kind === 'receptions';
  }

  facturer(): void {
    if (!this.canFacturer() || this.acting()) return;
    if (!confirm(`Transformer le BL ${this.piece} en facture fournisseur ?`)) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.facturerReception(this.piece).subscribe({
      next: (res) => {
        this.acting.set(false);
        const o = (res || {}) as Record<string, unknown>;
        const fa = String(o['numeroPieceFacture'] ?? o['NumeroPieceFacture'] ?? '');
        this.toast.set(fa ? `Facture créée : ${fa}` : 'Facture fournisseur créée');
        // Le BL facturé quitte le type BL dans Sage : ouvrir la facture.
        if (fa) void this.router.navigate(['/achat/factures-achat', fa]);
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Facturation impossible');
      },
    });
  }

  formatMoney(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }
}

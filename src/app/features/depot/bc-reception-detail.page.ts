import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BcReceptionService } from '../../core/services/bc-reception.service';
import { BcAchatDetail, BcAchatLigne, ReceptionnerPayload } from '../../core/models/bc-achat.model';

@Component({
  selector: 'app-bc-reception-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './bc-reception-detail.page.html',
  styleUrl: './bc-reception-detail.page.scss',
})
export class BcReceptionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BcReceptionService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<BcAchatDetail | null>(null);

  private piece = '';

  ngOnInit(): void {
    this.piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!this.piece) {
      void this.router.navigate(['/depot/bc-reception']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCommande(this.piece).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Commande introuvable');
      },
    });
  }

  formatAr(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  /** BC entièrement réceptionné : Sage le retire des BC (le GET renvoie alors introuvable). */
  readonly termine = signal(false);

  get completementLivre(): boolean {
    return this.termine() || !!this.detail()?.resteARecevoir?.completementLivre;
  }

  lignesAvecReste(): BcAchatLigne[] {
    return (this.detail()?.lignes ?? []).filter(
      (l) => (l.quantiteResteARecevoir ?? 0) > 0.0001
    );
  }

  /** Réception totale du reste (Sage gère) */
  receptionnerTotal(): void {
    if (this.acting() || this.completementLivre) return;
    if (!confirm(`Réceptionner entièrement le BC ${this.piece} (reste à livrer) ?`)) return;
    this.runReception(undefined);
  }

  /** Réception partielle selon quantités saisies */
  receptionnerPartiel(): void {
    if (this.acting() || this.completementLivre) return;

    // L'API identifie la ligne par numeroLigne (DL_No) : articleReference est ambigu
    // quand un article figure sur plusieurs lignes.
    const lignes = this.lignesAvecReste()
      .map((l) => ({
        numeroLigne: l.numeroLigne,
        quantiteRecue: Number(l.quantiteARecevoir) || 0,
      }))
      .filter((l) => l.quantiteRecue > 0);

    if (lignes.length === 0) {
      this.error.set('Saisir au moins une quantité à réceptionner.');
      return;
    }

    // Contrôle reste
    for (const l of this.lignesAvecReste()) {
      const q = Number(l.quantiteARecevoir) || 0;
      const reste = l.quantiteResteARecevoir ?? 0;
      if (q > reste + 0.0001) {
        this.error.set(
          `Qté reçue (${q}) > reste (${reste}) pour ${l.articleReference || 'ligne ' + l.numeroLigne}`
        );
        return;
      }
    }

    // Tout le reste saisi sur toutes les lignes → réception totale (sans liste de lignes).
    const toutLeReste =
      lignes.length === this.lignesAvecReste().length &&
      this.lignesAvecReste().every(
        (l) => Math.abs((Number(l.quantiteARecevoir) || 0) - (l.quantiteResteARecevoir ?? 0)) < 0.0001
      );

    if (!confirm(`Réception partielle de ${lignes.length} ligne(s) sur BC ${this.piece} ?`)) return;
    this.runReception(toutLeReste ? undefined : { lignes });
  }

  remplirReste(): void {
    const d = this.detail();
    if (!d) return;
    for (const l of d.lignes) {
      l.quantiteARecevoir = l.quantiteResteARecevoir ?? 0;
    }
    this.detail.set({ ...d, lignes: [...d.lignes] });
  }

  viderQtes(): void {
    const d = this.detail();
    if (!d) return;
    for (const l of d.lignes) {
      l.quantiteARecevoir = 0;
    }
    this.detail.set({ ...d, lignes: [...d.lignes] });
  }

  private runReception(body: ReceptionnerPayload | undefined): void {
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);

    this.api.receptionner(this.piece, body).subscribe({
      next: (res) => {
        this.acting.set(false);
        const bl = res.numeroPieceReception;
        const message = res.message || (bl ? `Réception ${bl} créée` : 'Réception effectuée');
        this.toast.set(message);
        // Recharger le BC : le reliquat a de nouveaux numéros de ligne.
        // S'il n'existe plus, c'est qu'il a été entièrement réceptionné.
        this.api.getCommande(this.piece).subscribe({
          next: (data) => this.detail.set(data),
          error: () => {
            this.termine.set(true);
            this.detail.set(null);
            this.toast.set(`${message} BC entièrement réceptionné.`);
          },
        });
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Réception impossible');
      },
    });
  }
}

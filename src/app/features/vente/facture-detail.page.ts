import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturesService, FormatImpressionFacture } from '../../core/services/factures.service';
import { AuthService } from '../../core/services/auth.service';
import { RfidSerialService } from '../../core/services/rfid-serial.service';
import { FactureDetail } from '../../core/models/facture.model';
import { RfidLecteurComponent } from '../../shared/components/rfid-lecteur/rfid-lecteur.component';

@Component({
  selector: 'app-facture-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, RfidLecteurComponent],
  templateUrl: './facture-detail.page.html',
  styleUrl: './facture-detail.page.scss',
})
export class FactureDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FacturesService);
  private readonly lecteur = inject(RfidSerialService);
  private readonly destroyRef = inject(DestroyRef);
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

    // Badge passé sur le lecteur USB pendant que la fenêtre du bon de retour est ouverte :
    // il remplit le champ et valide, comme dans les applications Caisse et Commercial.
    this.lecteur.uid$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((uid) => {
      if (!this.retourOpen() || this.acting()) return;
      this.rfid = uid;
      this.confirmerRetour();
    });
  }

  ngOnDestroy(): void {
    // Libère le port COM pour les autres programmes du poste (caisse, borne…).
    void this.lecteur.deconnecter();
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
    this.error.set(null);
    this.retourOpen.set(true);
    // Reprend sans fenêtre de choix un lecteur déjà autorisé dans ce navigateur.
    void this.lecteur.connecterAutomatiquement();
  }

  closeRetour(): void {
    if (this.acting()) return;
    this.retourOpen.set(false);
    void this.lecteur.deconnecter();
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
        void this.lecteur.deconnecter();
        if (br) {
          void this.router.navigate(['/depot/bons-retour', br]);
        } else {
          this.showToast('Bon de retour créé');
          void this.router.navigate(['/depot/bons-retour']);
        }
      },
      error: (err) => {
        this.acting.set(false);
        // Badge refusé : on vide le champ pour qu'un autre badge puisse être passé.
        this.rfid = '';
        this.error.set(err?.message || 'Transformation impossible');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2800);
  }
}

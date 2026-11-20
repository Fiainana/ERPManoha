import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AchatsService } from '../../core/services/achats.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AchatDetail,
  AchatEtatReglement,
  AchatLie,
  CommanderResultat,
  FacturerResultat,
  TYPES_ACHAT,
  TypeAchat,
  typeAchatDepuisDoType,
} from '../../core/models/achats.model';
import { ArPipe, QtePipe, estTypeAchat } from './achats-commun';
import { AchatsCommanderDialog, AchatsFacturerDialog, AchatsReglerDialog } from './achats-dialogs';

type Fenetre = 'commander' | 'facturer' | 'regler' | null;

/**
 * Détail d'un document d'achat : entête, lignes, chaîne des documents liés et l'action qui fait avancer
 * le document (changer le statut, commander, réceptionner, facturer, régler).
 */
@Component({
  selector: 'app-achats-detail-page',
  imports: [
    RouterLink,
    DatePipe,
    ArPipe,
    QtePipe,
    AchatsCommanderDialog,
    AchatsFacturerDialog,
    AchatsReglerDialog,
  ],
  templateUrl: './achats-detail.page.html',
  styleUrl: './achats.shared.scss',
})
export class AchatsDetailPage {
  private readonly api = inject(AchatsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** La réception d'un bon de commande appartient au dépôt (et à l'Admin). */
  readonly peutReceptionner = computed(() => this.auth.hasRole('Admin', 'Depot'));

  private readonly params = toSignal(
    this.route.paramMap.pipe(
      map((p) => ({
        type: (estTypeAchat(p.get('type')) ? p.get('type') : 'demandes') as TypeAchat,
        piece: p.get('piece') ?? '',
      }))
    ),
    { initialValue: { type: 'demandes' as TypeAchat, piece: '' } }
  );
  readonly type = computed(() => this.params().type);
  readonly piece = computed(() => this.params().piece);
  readonly pieces = computed(() => [this.piece()]);
  readonly info = computed(() => TYPES_ACHAT.find((t) => t.id === this.type())!);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly avertissement = signal<string | null>(null);
  readonly detail = signal<AchatDetail | null>(null);
  readonly etat = signal<AchatEtatReglement | null>(null);
  readonly fenetre = signal<Fenetre>(null);

  readonly lignesArticle = computed(() => this.detail()?.lignes.filter((l) => l.articleReference) ?? []);

  constructor() {
    effect(() => {
      this.params();
      untracked(() => {
        this.message.set(this.api.flash());
        this.api.flash.set(null);
        this.avertissement.set(null);
        this.charger();
      });
    });
  }

  charger(): void {
    if (!this.piece()) return;
    this.loading.set(true);
    this.error.set(null);
    this.detail.set(null);
    this.etat.set(null);
    this.api.detail(this.type(), this.piece()).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
        if (this.type() === 'factures') this.chargerReglements();
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }

  private chargerReglements(): void {
    this.api.reglements(this.piece()).subscribe({
      next: (e) => this.etat.set(e),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  telechargerPdf(): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.telechargerPdfDemande(this.piece()).subscribe({
      next: () => {
        this.acting.set(false);
        this.message.set('PDF téléchargé');
      },
      error: (e: Error) => {
        this.acting.set(false);
        this.error.set(e.message);
      },
    });
  }

  changerStatut(statut: number): void {
    const d = this.detail();
    if (!d || this.acting() || d.entete.statut === statut) return;
    this.acting.set(true);
    this.error.set(null);
    this.api.changerStatut(this.type(), this.piece(), statut).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.detail.set(r.document);
        this.message.set(r.message);
      },
      error: (e: Error) => {
        this.acting.set(false);
        this.error.set(e.message);
      },
    });
  }

  surCommande(r: CommanderResultat): void {
    this.fenetre.set(null);
    if (r.avertissement) this.avertissement.set(r.avertissement);
    if (r.numeroPieceCommande) {
      this.api.flash.set(r.message);
      void this.router.navigate(['/achats', 'commandes', r.numeroPieceCommande]);
    } else {
      this.message.set(r.message);
      this.charger();
    }
  }

  surFacture(r: FacturerResultat): void {
    this.fenetre.set(null);
    if (r.numeroPieceFacture) {
      this.api.flash.set(r.avertissement ? `${r.message} ${r.avertissement}` : r.message);
      void this.router.navigate(['/achats', 'factures', r.numeroPieceFacture]);
    } else {
      this.message.set(r.message);
      void this.router.navigate(['/achats', 'receptions']);
    }
  }

  surReglement(r: { message: string; etat: AchatEtatReglement }): void {
    this.fenetre.set(null);
    this.message.set(r.message);
    this.etat.set(r.etat);
    // Le reste à payer de l'entête suit le règlement.
    const d = this.detail();
    if (d)
      this.detail.set({
        ...d,
        entete: { ...d.entete, montantRegle: r.etat.montantRegle, resteAPayer: r.etat.resteAPayer },
      });
  }

  lien(l: AchatLie): string[] | null {
    const type = typeAchatDepuisDoType(l.typeDocument);
    // Une origine entièrement transformée n'existe plus dans Sage : pas de lien.
    return type && l.dateDocument ? ['/achats', type, l.numeroPiece] : null;
  }

  aRecevoir(): boolean {
    const r = this.detail()?.resteARecevoir;
    return !!r && !r.completementLivre;
  }

  paiement(): { code: string; libelle: string } | null {
    const e = this.detail()?.entete;
    if (!e || e.resteAPayer == null) return null;
    if (e.resteAPayer <= 0.009) return { code: 'regle', libelle: 'Réglée' };
    return (e.montantRegle ?? 0) > 0.009
      ? { code: 'partiel', libelle: 'Réglée en partie' }
      : { code: 'du', libelle: 'À payer' };
  }
}

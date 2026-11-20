import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, map } from 'rxjs';
import { AchatsService } from '../../core/services/achats.service';
import { AchatEntete, AchatResume, FacturerResultat, TYPES_ACHAT, TypeAchat } from '../../core/models/achats.model';
import { ScrollInfiniDirective } from '../analyse/scroll-infini.directive';
import { ArPipe, estTypeAchat } from './achats-commun';
import { AchatsFacturerDialog } from './achats-dialogs';

const LOT = 40;

/**
 * Liste d'un type de document d'achat Sage (demandes, préparations, bons de commande, bons de livraison,
 * factures) : recherche, période, chargement au défilement. Les bons de livraison se cochent pour être
 * facturés ensemble.
 */
@Component({
  selector: 'app-achats-liste-page',
  imports: [RouterLink, FormsModule, DatePipe, ArPipe, ScrollInfiniDirective, AchatsFacturerDialog],
  templateUrl: './achats-liste.page.html',
  styleUrl: './achats.shared.scss',
})
export class AchatsListePage {
  private readonly api = inject(AchatsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private requete?: Subscription;
  private delai?: ReturnType<typeof setTimeout>;

  readonly type = toSignal(
    this.route.paramMap.pipe(map((p) => (estTypeAchat(p.get('type')) ? (p.get('type') as TypeAchat) : 'demandes'))),
    { initialValue: 'demandes' as TypeAchat }
  );
  readonly info = computed(() => TYPES_ACHAT.find((t) => t.id === this.type())!);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly items = signal<AchatEntete[]>([]);
  readonly resume = signal<AchatResume | null>(null);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly fini = computed(() => this.items().length >= this.total());

  /** Bons de livraison cochés pour une facture commune. */
  readonly selection = signal<AchatEntete[]>([]);
  readonly aFacturer = signal<string[] | null>(null);

  search = '';
  dateDebut = '';
  dateFin = '';
  nonReglees = false;

  constructor() {
    effect(() => {
      this.type();
      untracked(() => {
        this.search = '';
        this.dateDebut = '';
        this.dateFin = '';
        this.nonReglees = this.route.snapshot.queryParamMap.get('nonReglees') === 'true';
        this.search = this.route.snapshot.queryParamMap.get('search') ?? '';
        this.message.set(null);
        this.recharger();
      });
    });
  }

  /** Saisie dans la recherche : on attend la fin de la frappe. */
  surRecherche(): void {
    clearTimeout(this.delai);
    this.delai = setTimeout(() => this.recharger(), 300);
  }

  recharger(): void {
    this.requete?.unsubscribe();
    this.items.set([]);
    this.total.set(0);
    this.page.set(0);
    this.selection.set([]);
    this.charger();
  }

  suivant(): void {
    if (!this.loading() && !this.fini() && !this.error()) this.charger();
  }

  reinitialiser(): void {
    this.search = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.nonReglees = false;
    this.recharger();
  }

  filtre(): boolean {
    return !!(this.search || this.dateDebut || this.dateFin || this.nonReglees);
  }

  private charger(): void {
    const page = this.page() + 1;
    this.loading.set(true);
    this.error.set(null);
    this.requete = this.api
      .lister(this.type(), {
        search: this.search.trim() || undefined,
        dateDebut: this.dateDebut || undefined,
        dateFin: this.dateFin || undefined,
        nonReglees: this.type() === 'factures' && this.nonReglees,
        page,
        pageSize: LOT,
      })
      .subscribe({
        next: (d) => {
          this.items.set(page === 1 ? d.items : [...this.items(), ...d.items]);
          this.total.set(d.total);
          this.resume.set(d.resume);
          this.page.set(page);
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.loading.set(false);
          this.error.set(e.message);
        },
      });
  }

  ouvrir(d: AchatEntete, evenement: MouseEvent): void {
    // Un clic sur la case à cocher ou sur le lien ne doit pas ouvrir deux fois.
    if ((evenement.target as HTMLElement).closest('input, a, label')) return;
    void this.router.navigate(['/achats', this.type(), d.numeroPiece]);
  }

  /** Colonnes de la grille selon le type (case à cocher pour les BL, règlement pour les factures). */
  colonnes(): string {
    switch (this.type()) {
      case 'receptions':
        return '28px minmax(110px, 1fr) 90px minmax(160px, 2fr) minmax(110px, 1.2fr) 110px minmax(100px, 1fr)';
      case 'factures':
        return 'minmax(110px, 1fr) 90px minmax(160px, 2fr) minmax(110px, 1.2fr) minmax(100px, 1fr) minmax(100px, 1fr) 100px';
      default:
        return 'minmax(110px, 1fr) 90px minmax(160px, 2fr) minmax(110px, 1.2fr) 130px minmax(100px, 1fr)';
    }
  }

  estCoche(d: AchatEntete): boolean {
    return this.selection().some((s) => s.numeroPiece === d.numeroPiece);
  }

  /** On ne réunit sur une facture que des BL du même fournisseur. */
  cochable(d: AchatEntete): boolean {
    const premier = this.selection()[0];
    return !premier || premier.fournisseurCode === d.fournisseurCode;
  }

  cocher(d: AchatEntete): void {
    this.selection.set(
      this.estCoche(d) ? this.selection().filter((s) => s.numeroPiece !== d.numeroPiece) : [...this.selection(), d]
    );
  }

  totalSelection(): number {
    return this.selection().reduce((s, d) => s + d.totalTTC, 0);
  }

  facturerSelection(): void {
    this.aFacturer.set(this.selection().map((s) => s.numeroPiece));
  }

  surFacture(r: FacturerResultat): void {
    this.aFacturer.set(null);
    if (r.numeroPieceFacture) void this.router.navigate(['/achats', 'factures', r.numeroPieceFacture]);
    else {
      this.message.set(r.message);
      this.recharger();
    }
  }

  /** État de paiement d'une facture pour la pastille. */
  paiement(d: AchatEntete): { code: string; libelle: string } {
    const reste = d.resteAPayer ?? 0;
    if (reste <= 0.009) return { code: 'regle', libelle: 'Réglée' };
    return (d.montantRegle ?? 0) > 0.009 ? { code: 'partiel', libelle: 'Partiel' } : { code: 'du', libelle: 'À payer' };
  }
}

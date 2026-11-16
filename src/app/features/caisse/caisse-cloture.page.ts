import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CaisseService } from '../../core/services/caisse.service';
import { JourCaisse, LIBELLES_STATUT_CLOTURE } from '../../core/models/caisse.model';
import { aujourdhuiIso, ouvrirPdf } from './caisse-commun';

/**
 * Clôture du jour : état de règlement (Sage), billetage des espèces avec écart en direct, clôture avec code de
 * versement, PDF, versement en banque. Une clôture par jour pour tout le magasin.
 */
@Component({
  selector: 'app-caisse-cloture-page',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './caisse-cloture.page.html',
  styleUrls: ['../rh/rh.scss', './caisse.scss'],
})
export class CaisseCloturePage implements OnInit {
  private readonly api = inject(CaisseService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly estAdmin = this.auth.hasRole('Admin');
  readonly statuts = LIBELLES_STATUT_CLOTURE;

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly data = signal<JourCaisse | null>(null);
  readonly confirmation = signal(false);
  readonly modal = signal<'versement' | 'rouvrir' | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly detailOuvert = signal(false);

  jour = aujourdhuiIso();
  readonly aujourdhui = aujourdhuiIso();

  /** Nombre de billets par coupure (saisie). */
  readonly billets = signal<Record<number, number | null>>({});
  readonly pieces = signal<number | null>(null);
  readonly controles = signal<Record<number, number | null>>({});
  motifEcart = '';
  commentaire = '';

  versement = { journal: '', date: aujourdhuiIso(), montant: 0, bordereau: '', note: '' };
  motifReouverture = '';

  readonly cloture = computed(() => this.data()?.cloture ?? null);
  /** Saisie possible : pas encore clôturé, ou clôture rouverte. */
  readonly enSaisie = computed(() => {
    const c = this.cloture();
    return !!this.data() && (!c || c.statut === 'Rouverte');
  });

  readonly totalCompte = computed(() => {
    const b = this.billets();
    const billets = (this.data()?.coupures ?? []).reduce((s, c) => s + c * (Number(b[c]) || 0), 0);
    return billets + (Number(this.pieces()) || 0);
  });
  readonly especesAttendues = computed(() => this.data()?.etat.especesAttendues ?? 0);
  readonly ecart = computed(() => Math.round((this.totalCompte() - this.especesAttendues()) * 100) / 100);
  readonly autresModes = computed(() => (this.data()?.etat.parMode ?? []).filter((m) => !m.especes));
  readonly controlesEnEcart = computed(() => {
    const c = this.controles();
    return this.autresModes().filter((m) => c[m.modeIndex] != null && c[m.modeIndex] !== m.nb);
  });
  readonly motifRequis = computed(() => Math.abs(this.ecart()) >= 0.5 || this.controlesEnEcart().length > 0);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('jour');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) this.jour = q;
    this.charger();
  }

  changerJour(): void {
    if (!this.jour) return;
    void this.router.navigate([], { queryParams: { jour: this.jour }, replaceUrl: true });
    this.toast.set(null);
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.jour(this.jour).subscribe({
      next: (r) => {
        this.appliquer(r.data);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.data.set(null);
        this.error.set(e.message);
      },
    });
  }

  /** Après chargement : saisie vide, ou reprise du billetage d'une clôture rouverte. */
  private appliquer(d: JourCaisse): void {
    this.data.set(d);
    const c = d.cloture;
    const billets: Record<number, number | null> = {};
    for (const coupure of d.coupures) {
      const n = c?.billetage.find((b) => b.coupure === coupure)?.nombre ?? 0;
      billets[coupure] = c && n ? n : null;
    }
    this.billets.set(billets);
    this.pieces.set(c && c.montantPieces ? c.montantPieces : null);
    const controles: Record<number, number | null> = {};
    for (const ctl of c?.controles ?? []) controles[ctl.modeIndex] = ctl.nbCompte;
    this.controles.set(controles);
    this.motifEcart = c?.motifEcart ?? '';
    this.commentaire = c?.commentaire ?? '';
  }

  setBillet(coupure: number, valeur: number | null): void {
    this.error.set(null);
    this.billets.update((b) => ({ ...b, [coupure]: valeur == null || Number.isNaN(valeur) ? null : Math.max(0, Math.floor(valeur)) }));
  }

  setPieces(valeur: number | null): void {
    this.error.set(null);
    this.pieces.set(valeur == null || Number.isNaN(valeur) ? null : Math.max(0, valeur));
  }

  setControle(modeIndex: number, valeur: number | null): void {
    this.error.set(null);
    this.controles.update((c) => ({ ...c, [modeIndex]: valeur == null || Number.isNaN(valeur) ? null : Math.max(0, Math.floor(valeur)) }));
  }

  montantCoupure(coupure: number): number {
    return coupure * (Number(this.billets()[coupure]) || 0);
  }

  // —— Clôture ——

  demanderCloture(): void {
    this.error.set(null);
    if (this.motifRequis() && !this.motifEcart.trim()) {
      this.error.set('Il y a un écart : indiquez son motif avant de clôturer.');
      return;
    }
    this.confirmation.set(true);
  }

  cloturer(): void {
    const d = this.data();
    if (!d || this.acting()) return;
    this.acting.set(true);
    const b = this.billets();
    const c = this.controles();
    this.api
      .cloturer({
        jour: d.jour,
        billets: d.coupures.filter((x) => Number(b[x]) > 0).map((x) => ({ coupure: x, nombre: Number(b[x]) })),
        montantPieces: Number(this.pieces()) || 0,
        controles: this.autresModes()
          .filter((m) => c[m.modeIndex] != null)
          .map((m) => ({ modeIndex: m.modeIndex, nombreCompte: Number(c[m.modeIndex]) })),
        motifEcart: this.motifEcart.trim() || null,
        commentaire: this.commentaire.trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.acting.set(false);
          this.confirmation.set(false);
          this.appliquer(r.data);
          this.toast.set(`Journée clôturée. Code du versement : ${r.data.cloture?.code}.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (e: Error) => {
          this.acting.set(false);
          this.confirmation.set(false);
          this.error.set(e.message);
        },
      });
  }

  imprimer(): void {
    const d = this.data();
    if (!d) return;
    ouvrirPdf(this.api.pdf(d.jour), (m) => this.error.set(m));
  }

  copierCode(): void {
    const code = this.cloture()?.code;
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => this.toast.set(`Code ${code} copié.`),
      () => {}
    );
  }

  // —— Versement ——

  ouvrirVersement(): void {
    const c = this.cloture();
    const d = this.data();
    if (!c || !d) return;
    const v = c.versement;
    this.versement = {
      journal: v?.journal ?? d.banques[0]?.journal ?? '',
      date: v?.date ?? this.aujourdhui,
      montant: v?.montant ?? c.montantAVerser,
      bordereau: v?.bordereau ?? '',
      note: v?.note ?? '',
    };
    this.modalError.set(null);
    this.modal.set('versement');
  }

  verser(): void {
    const d = this.data();
    if (!d || this.acting()) return;
    if (!this.versement.journal || !this.versement.date || !this.versement.bordereau.trim()) {
      this.modalError.set('La banque, la date et le n° du bordereau sont obligatoires.');
      return;
    }
    if (!(this.versement.montant > 0)) {
      this.modalError.set('Le montant versé doit être positif.');
      return;
    }
    this.acting.set(true);
    this.modalError.set(null);
    this.api
      .verser(d.jour, {
        journal: this.versement.journal,
        date: this.versement.date,
        montant: this.versement.montant,
        bordereau: this.versement.bordereau.trim(),
        note: this.versement.note.trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.acting.set(false);
          this.modal.set(null);
          this.appliquer(r.data);
          this.toast.set(r.message || 'Versement enregistré.');
        },
        error: (e: Error) => {
          this.acting.set(false);
          this.modalError.set(e.message);
        },
      });
  }

  // —— Réouverture (Admin) ——

  ouvrirReouverture(): void {
    this.motifReouverture = '';
    this.modalError.set(null);
    this.modal.set('rouvrir');
  }

  rouvrir(): void {
    const d = this.data();
    if (!d || this.acting()) return;
    if (!this.motifReouverture.trim()) {
      this.modalError.set('Le motif est obligatoire.');
      return;
    }
    this.acting.set(true);
    this.api.rouvrir(d.jour, this.motifReouverture.trim()).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.modal.set(null);
        this.appliquer(r.data);
        this.toast.set('Clôture rouverte : corrigez le billetage puis clôturez de nouveau.');
      },
      error: (e: Error) => {
        this.acting.set(false);
        this.modalError.set(e.message);
      },
    });
  }

  libelleAction(a: string): string {
    switch (a) {
      case 'Cloture':
        return 'Clôture';
      case 'Recloture':
        return 'Nouvelle clôture';
      case 'Reouverture':
        return 'Réouverture';
      case 'Versement':
        return 'Versement en banque';
      case 'Correction versement':
        return 'Correction du versement';
      default:
        return a;
    }
  }
}

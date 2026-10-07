import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventairesService } from '../../core/services/inventaires.service';
import { AuthService } from '../../core/services/auth.service';
import { InventaireDetail, InventaireLigne } from '../../core/models/inventaire.model';

@Component({
  selector: 'app-inventaire-detail-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './inventaire-detail.page.html',
  styleUrl: './inventaire-detail.page.scss',
})
export class InventaireDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(InventairesService);
  readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly detail = signal<InventaireDetail | null>(null);

  /** Admin : n'afficher que les lignes en écart. */
  ecartsSeulement = false;
  nouvelArticle = '';
  nouvelleQte: number | null = null;

  private id = 0;

  readonly statut = computed(() => this.detail()?.entete.statut ?? '');
  readonly enComptage = computed(() => this.statut() === 'Brouillon');
  readonly aValider = computed(() => this.statut() === 'Soumis');
  readonly aveugle = computed(() => this.detail()?.comptageAveugle ?? true);

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id) {
      void this.router.navigate(['/depot/inventaire']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.id).subscribe({
      next: (d) => this.setDetail(d),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Inventaire introuvable');
      },
    });
  }

  lignesAffichees(): InventaireLigne[] {
    const lignes = this.detail()?.lignes ?? [];
    if (!this.ecartsSeulement || this.aveugle()) return lignes;
    return lignes.filter((l) => l.ecart != null && Math.abs(l.ecart) > 0.0001);
  }

  nbSaisies(): number {
    return (this.detail()?.lignes ?? []).filter((l) => l.saisie != null && `${l.saisie}` !== '').length;
  }

  /** Enregistre les quantités saisies (sans soumettre). */
  enregistrer(then?: () => void): void {
    const d = this.detail();
    if (!d || this.acting()) return;

    const lignes = d.lignes.map((l) => ({
      articleReference: l.articleReference,
      qteComptee: this.qte(l.saisie),
    }));
    if (lignes.some((l) => l.qteComptee != null && l.qteComptee < 0)) {
      this.error.set('Les quantités comptées ne peuvent pas être négatives.');
      return;
    }

    this.acting.set(true);
    this.error.set(null);
    this.api.compter(this.id, lignes).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.setDetail(res);
        if (then) then();
        else this.showToast('Comptage enregistré');
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Enregistrement impossible');
      },
    });
  }

  ajouterArticle(): void {
    const ar = this.nouvelArticle.trim().toUpperCase();
    if (!ar || this.acting()) return;
    if (this.nouvelleQte == null || this.nouvelleQte < 0) {
      this.error.set('Saisir la quantité comptée de l’article à ajouter.');
      return;
    }
    if (this.detail()?.lignes.some((l) => l.articleReference.toUpperCase() === ar)) {
      this.error.set(`L’article ${ar} est déjà dans l’inventaire.`);
      return;
    }

    this.acting.set(true);
    this.error.set(null);
    this.api.compter(this.id, [{ articleReference: ar, qteComptee: this.nouvelleQte }]).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.nouvelArticle = '';
        this.nouvelleQte = null;
        this.setDetail(res, true);
        this.showToast(`Article ${ar} ajouté`);
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Ajout impossible');
      },
    });
  }

  soumettre(): void {
    const d = this.detail();
    if (!d) return;
    const restants = d.lignes.length - this.nbSaisies();
    if (restants > 0) {
      this.error.set(`${restants} article(s) non compté(s). Saisir 0 si l’article est absent.`);
      return;
    }
    if (!confirm('Soumettre le comptage à l’admin ? Il ne sera plus modifiable.')) return;

    this.enregistrer(() => {
      this.acting.set(true);
      this.api.soumettre(this.id).subscribe({
        next: (res) => {
          this.acting.set(false);
          this.setDetail(res);
          this.showToast('Comptage soumis — en attente de validation admin');
        },
        error: (err) => {
          this.acting.set(false);
          this.error.set(err?.message || 'Soumission impossible');
        },
      });
    });
  }

  renvoyer(): void {
    if (this.acting()) return;
    const note = prompt('Motif du renvoi au dépôt (recomptage) :', '');
    if (note === null) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.renvoyer(this.id, note.trim() || null).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.setDetail(res);
        this.showToast('Inventaire renvoyé au dépôt pour recomptage');
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Renvoi impossible');
      },
    });
  }

  valider(): void {
    const d = this.detail();
    if (!d || this.acting()) return;
    const ignorees = d.lignes.filter((l) => l.aIgnorer).map((l) => l.id);
    const nbAjustes = d.lignes.filter(
      (l) => !l.aIgnorer && l.ecart != null && Math.abs(l.ecart) > 0.0001
    ).length;

    const msg =
      nbAjustes === 0
        ? 'Valider l’inventaire ? Aucun ajustement de stock ne sera fait dans Sage.'
        : `Valider l’inventaire et ajuster ${nbAjustes} article(s) dans Sage ?` +
          (ignorees.length ? `\n${ignorees.length} ligne(s) écartée(s) ne seront pas ajustées.` : '');
    if (!confirm(msg)) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.valider(this.id, ignorees).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.showToast(res.message || 'Inventaire validé');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Validation impossible');
      },
    });
  }

  annuler(): void {
    if (this.acting()) return;
    if (!confirm('Annuler cet inventaire ? Aucun ajustement ne sera fait.')) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.annuler(this.id).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.setDetail(res);
        this.showToast('Inventaire annulé');
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Annulation impossible');
      },
    });
  }

  formatEcart(e: number | null): string {
    if (e == null) return '—';
    const txt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(e);
    return e > 0 ? '+' + txt : txt;
  }

  libelleStatut(s: string): string {
    switch (s) {
      case 'Brouillon':
        return 'À compter';
      case 'Soumis':
        return 'À valider';
      case 'Valide':
        return 'Validé';
      case 'Annule':
        return 'Annulé';
      default:
        return s;
    }
  }

  /** Dates API stockées en UTC (SYSUTCDATETIME) sans fuseau. */
  utc(d: string | null): string | null {
    if (!d) return null;
    return /[zZ]|[+-]\d\d:\d\d$/.test(d) ? d : d + 'Z';
  }

  /** Conserve les saisies en cours quand on recharge après un ajout d'article. */
  private setDetail(d: InventaireDetail, garderSaisies = false): void {
    const precedentes = new Map(
      (this.detail()?.lignes ?? []).map((l) => [l.articleReference, l.saisie] as const)
    );
    for (const l of d.lignes) {
      l.saisie = garderSaisies && precedentes.has(l.articleReference)
        ? precedentes.get(l.articleReference) ?? null
        : l.qteComptee;
      l.aIgnorer = l.ignoree;
    }
    this.detail.set(d);
    this.loading.set(false);
  }

  private qte(v: number | string | null | undefined): number | null {
    if (v == null || `${v}`.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3500);
  }
}

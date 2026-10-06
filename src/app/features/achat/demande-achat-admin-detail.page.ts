import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandesAchatService } from '../../core/services/demandes-achat.service';
import { MouvementsStockService } from '../../core/services/mouvements-stock.service';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import { ArticlesService } from '../../core/services/articles.service';
import {
  DemandeAchatDetail,
  DemandeAchatLigne,
  FamilleOption,
  GenererSagePayload,
  UniteOption,
} from '../../core/models/demande-achat.model';
import { DepotOption } from '../../core/models/mouvement-stock.model';
import { Fournisseur } from '../../core/models/fournisseur.model';
import { Article } from '../../core/models/article.model';

@Component({
  selector: 'app-demande-achat-admin-detail-page',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './demande-achat-admin-detail.page.html',
  styleUrl: './demande-achat-admin-detail.page.scss',
})
export class DemandeAchatAdminDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DemandesAchatService);
  private readonly depotsApi = inject(MouvementsStockService);
  private readonly fournApi = inject(FournisseursService);
  private readonly articlesApi = inject(ArticlesService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly item = signal<DemandeAchatDetail | null>(null);
  readonly depots = signal<DepotOption[]>([]);
  readonly fournHits = signal<Fournisseur[]>([]);
  readonly familles = signal<FamilleOption[]>([]);
  readonly unites = signal<UniteOption[]>([]);
  readonly suiviOptions = signal<{ valeur: number; libelle: string }[]>([
    { valeur: 0, libelle: 'Aucun' },
    { valeur: 1, libelle: 'Sérialisé' },
    { valeur: 2, libelle: 'CMUP' },
    { valeur: 3, libelle: 'FIFO' },
    { valeur: 4, libelle: 'LIFO' },
    { valeur: 5, libelle: 'Par lot' },
  ]);
  readonly modalOpen = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly articleHits = signal<Article[]>([]);
  readonly nextRefHint = signal<string | null>(null);
  readonly searchingArt = signal(false);

  private id = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  depotNo: number | null = null;
  fournisseurCode = '';
  fournQuery = '';
  reference = '';
  lignesEdit: DemandeAchatLigne[] = [];

  // modal création article
  articleLigneId: number | null = null;
  articleLigneLabel = '';
  arRef = '';
  artDesign = '';
  codeFamille = '';
  prixAchat: number | null = null;
  prixVente: number | null = null;
  uniteVenteNo: number | null = null;
  /** AR_SuiviStock Sage : 0–5 */
  suiviStockType = 2;
  rattacherSiExiste = true;
  artSearchQuery = '';

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id) {
      void this.router.navigate(['/achat/demandes-achat-admin']);
      return;
    }
    this.depotsApi.listDepots().subscribe({
      next: (d) => this.depots.set(d),
      error: () => this.depots.set([]),
    });
    this.api.referentielArticle().subscribe({
      next: (r) => {
        this.familles.set(r.familles);
        this.unites.set(r.unites);
        if (r.suiviStockOptions?.length) {
          this.suiviOptions.set(r.suiviStockOptions);
        }
      },
      error: () => {
        this.familles.set([]);
        this.unites.set([]);
      },
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.id).subscribe({
      next: (d) => {
        this.item.set(d);
        this.lignesEdit = d.lignes.map((l) => ({
          ...l,
          quantiteConfirmee: l.quantite,
          prixUnitaire: null,
        }));
        if (d.fournisseurCode) this.fournisseurCode = d.fournisseurCode;
        if (d.depotNo) this.depotNo = d.depotNo;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Demande introuvable');
      },
    });
  }

  canTransform(): boolean {
    const s = this.item()?.statut || '';
    return s === 'ArticlePret' || s === 'EnAttenteArticle' || s === 'Envoyee';
  }

  searchFourn(): void {
    const q = this.fournQuery.trim();
    if (q.length < 2) {
      this.fournHits.set([]);
      return;
    }
    this.fournApi.list({ search: q, page: 1, pageSize: 8 }).subscribe({
      next: (r) => this.fournHits.set(r.items ?? []),
      error: () => this.fournHits.set([]),
    });
  }

  pickFourn(f: Fournisseur): void {
    this.fournisseurCode = f.numero;
    this.fournQuery = f.intitule || f.numero;
    this.fournHits.set([]);
  }

  genererBc(): void {
    if (this.acting() || !this.canTransform()) return;
    if (!this.depotNo || this.depotNo < 1) {
      this.error.set('Choisis un dépôt de réception.');
      return;
    }

    const body: GenererSagePayload = {
      depotNo: this.depotNo,
      fournisseurCode: this.fournisseurCode.trim() || null,
      reference: this.reference.trim() || null,
      lignes: this.lignesEdit
        .filter((l) => l.id > 0)
        .map((l) => ({
          ligneId: l.id,
          quantite: l.quantiteConfirmee ?? l.quantite,
          prixUnitaire: l.prixUnitaire ?? null,
        })),
    };

    if (!confirm('Créer le bon de commande fournisseur dans Sage ?')) return;

    this.acting.set(true);
    this.error.set(null);
    this.api.genererSage(this.id, body).subscribe({
      next: (res) => {
        this.acting.set(false);
        const o = (res || {}) as Record<string, unknown>;
        const piece = String(
          o['numeroPiece'] ?? o['NumeroPiece'] ?? o['pieceSage'] ?? o['PieceSage'] ?? ''
        );
        this.toast.set(piece ? `BC Sage créé : ${piece}` : 'BC Sage créé');
        this.load();
      },
      error: (err) => {
        this.acting.set(false);
        this.error.set(err?.message || 'Transformation impossible');
      },
    });
  }

  openArticleModal(l: DemandeAchatLigne): void {
    this.articleLigneId = l.id;
    this.articleLigneLabel = l.designation || l.refFournisseur || `Ligne #${l.id}`;
    this.arRef = '';
    this.artDesign = l.designation || l.refFournisseur || '';
    this.codeFamille = '';
    this.prixAchat = null;
    this.prixVente = null;
    this.uniteVenteNo = null;
    this.suiviStockType = 2; // CMUP par défaut
    this.rattacherSiExiste = true;
    this.artSearchQuery = '';
    this.articleHits.set([]);
    this.nextRefHint.set(null);
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeArticleModal(): void {
    this.modalOpen.set(false);
    this.articleLigneId = null;
    this.modalError.set(null);
    this.articleHits.set([]);
    this.nextRefHint.set(null);
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onFamilleChange(): void {
    const fam = this.familles().find((f) => f.code === this.codeFamille);
    if (!fam) return;
    if (fam.uniteVenteNo != null && this.uniteVenteNo == null) {
      this.uniteVenteNo = fam.uniteVenteNo;
    }
    if (fam.suiviStock != null) {
      this.suiviStockType = fam.suiviStock;
    }
  }

  /** Recherche articles existants (préfixe / libellé) + calcul n° suivant. */
  onArtSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const q = this.artSearchQuery.trim();
    if (q.length < 1) {
      this.articleHits.set([]);
      this.nextRefHint.set(null);
      return;
    }
    this.searchTimer = setTimeout(() => this.searchArticles(q), 280);
  }

  searchArticles(q: string): void {
    this.searchingArt.set(true);
    this.articlesApi.list({ search: q, page: 1, pageSize: 30 }).subscribe({
      next: (r) => {
        this.searchingArt.set(false);
        const items = r.items ?? [];
        this.articleHits.set(items.slice(0, 12));
        this.nextRefHint.set(this.computeNextRef(q, items));
      },
      error: () => {
        this.searchingArt.set(false);
        this.articleHits.set([]);
        this.nextRefHint.set(null);
      },
    });
  }

  /**
   * Propose le prochain AR_Ref : préfixe + (max numérique + 1).
   * Ex. ART001, ART012 → ART013
   */
  private computeNextRef(query: string, items: Article[]): string | null {
    const prefix = query.trim().toUpperCase().replace(/[^A-Z0-9\-_./]/g, '');
    if (!prefix) return null;

    // Extraire base alphabétique et partie numérique éventuelle de la requête
    const mQ = prefix.match(/^(.*?)(\d+)$/);
    const base = mQ ? mQ[1] : prefix;
    let maxNum = mQ ? Number(mQ[2]) - 1 : 0;
    let pad = mQ ? mQ[2].length : 3;

    const re = new RegExp(
      `^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\d+)$`,
      'i'
    );

    for (const a of items) {
      const ref = (a.reference || '').trim().toUpperCase();
      const m = ref.match(re);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > maxNum) {
          maxNum = n;
          pad = Math.max(pad, m[1].length);
        }
      }
    }

    if (!base && maxNum === 0) return null;
    const next = maxNum + 1;
    const candidate = `${base}${String(next).padStart(pad, '0')}`;
    return candidate.length <= 19 ? candidate : candidate.slice(0, 19);
  }

  applyNextRef(): void {
    const hint = this.nextRefHint();
    if (hint) {
      this.arRef = hint;
      this.modalError.set(null);
    }
  }

  pickExistingArticle(a: Article): void {
    this.arRef = a.reference;
    if (a.designation) this.artDesign = a.designation;
    if (a.codeFamille) this.codeFamille = a.codeFamille;
    if (a.prixAchat != null) this.prixAchat = a.prixAchat;
    if (a.prixVente != null) this.prixVente = a.prixVente;
    if (a.uniteVenteNo != null) this.uniteVenteNo = a.uniteVenteNo;
    this.rattacherSiExiste = true;
    this.articleHits.set([]);
    this.nextRefHint.set(null);
    this.artSearchQuery = a.reference;
  }

  submitArticle(): void {
    if (!this.articleLigneId || this.acting()) return;

    const ref = this.arRef.trim().toUpperCase();
    const fam = this.codeFamille.trim();
    const des = this.artDesign.trim();

    if (!ref) {
      this.modalError.set('La référence article (AR_Ref) est obligatoire.');
      return;
    }
    if (ref.length > 19) {
      this.modalError.set('AR_Ref : max 19 caractères.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9\-_./]*$/.test(ref)) {
      this.modalError.set('AR_Ref : lettres, chiffres, - _ . / uniquement.');
      return;
    }
    if (!fam) {
      this.modalError.set('Le code famille est obligatoire.');
      return;
    }
    if (this.prixAchat == null || this.prixAchat < 0 || !Number.isFinite(this.prixAchat)) {
      this.modalError.set("Le prix d'achat est obligatoire (≥ 0).");
      return;
    }
    if (!des) {
      this.modalError.set('La désignation est obligatoire.');
      return;
    }
    if (this.suiviStockType < 0 || this.suiviStockType > 5) {
      this.modalError.set('Suivi de stock invalide (0–5).');
      return;
    }

    this.acting.set(true);
    this.modalError.set(null);
    this.error.set(null);

    // API demande : SuiviStock bool — true si type > 0
    const suiviBool = this.suiviStockType !== 0;

    this.api
      .creerArticle(this.id, this.articleLigneId, {
        articleReference: ref,
        designation: des,
        prixAchat: Number(this.prixAchat),
        prixVente:
          this.prixVente != null && Number.isFinite(this.prixVente) ? Number(this.prixVente) : null,
        uniteVenteNo: this.uniteVenteNo ?? null,
        codeFamille: fam,
        suiviStock: suiviBool,
        rattacherSiExiste: this.rattacherSiExiste,
      })
      .subscribe({
        next: (res) => {
          this.acting.set(false);
          this.closeArticleModal();
          const o = (res || {}) as Record<string, unknown>;
          const created = String(o['articleReference'] ?? o['ArticleReference'] ?? ref);
          this.toast.set(`Article '${created}' créé via OM et rattaché`);
          this.load();
        },
        error: (err) => {
          this.acting.set(false);
          this.modalError.set(err?.message || 'Création article impossible');
        },
      });
  }

  statutClass(s: string | null | undefined): string {
    const v = (s || '').toLowerCase();
    if (v.includes('annul')) return 'is-cancel';
    if (v.includes('commande') || v.includes('reception')) return 'is-done';
    if (v.includes('attente')) return 'is-wait';
    if (v.includes('pret')) return 'is-ok';
    return '';
  }
}

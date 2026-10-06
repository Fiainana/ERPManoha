import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandesAchatService } from '../../core/services/demandes-achat.service';
import { MouvementsStockService } from '../../core/services/mouvements-stock.service';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import {
  DemandeAchatDetail,
  DemandeAchatLigne,
  FamilleOption,
  GenererSagePayload,
  UniteOption,
} from '../../core/models/demande-achat.model';
import { DepotOption } from '../../core/models/mouvement-stock.model';
import { Fournisseur } from '../../core/models/fournisseur.model';

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

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly item = signal<DemandeAchatDetail | null>(null);
  readonly depots = signal<DepotOption[]>([]);
  readonly fournHits = signal<Fournisseur[]>([]);
  readonly familles = signal<FamilleOption[]>([]);
  readonly unites = signal<UniteOption[]>([]);
  readonly modalOpen = signal(false);
  readonly modalError = signal<string | null>(null);

  private id = 0;

  depotNo: number | null = null;
  fournisseurCode = '';
  fournQuery = '';
  reference = '';
  lignesEdit: DemandeAchatLigne[] = [];

  // modal création article (CreerArticleDemandeRequest)
  articleLigneId: number | null = null;
  articleLigneLabel = '';
  arRef = '';
  artDesign = '';
  codeFamille = '';
  prixAchat: number | null = null;
  prixVente: number | null = null;
  uniteVenteNo: number | null = null;
  suiviStock = true;
  rattacherSiExiste = true;

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
    this.suiviStock = true;
    this.rattacherSiExiste = true;
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeArticleModal(): void {
    this.modalOpen.set(false);
    this.articleLigneId = null;
    this.modalError.set(null);
  }

  onFamilleChange(): void {
    const fam = this.familles().find((f) => f.code === this.codeFamille);
    if (!fam) return;
    // Préremplir unité / suivi depuis la famille Sage si disponibles
    if (fam.uniteVenteNo != null && this.uniteVenteNo == null) {
      this.uniteVenteNo = fam.uniteVenteNo;
    }
    if (fam.suiviStock != null) {
      this.suiviStock = fam.suiviStock !== 0;
    }
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

    this.acting.set(true);
    this.modalError.set(null);
    this.error.set(null);

    this.api
      .creerArticle(this.id, this.articleLigneId, {
        articleReference: ref,
        designation: des,
        prixAchat: Number(this.prixAchat),
        prixVente:
          this.prixVente != null && Number.isFinite(this.prixVente) ? Number(this.prixVente) : null,
        uniteVenteNo: this.uniteVenteNo ?? null,
        codeFamille: fam,
        suiviStock: this.suiviStock,
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

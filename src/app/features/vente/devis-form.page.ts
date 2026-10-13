import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DevisService } from '../../core/services/devis.service';
import { ClientsService } from '../../core/services/clients.service';
import { ArticlesService } from '../../core/services/articles.service';
import { Client } from '../../core/models/client.model';
import { Article } from '../../core/models/article.model';
import { DevisLignePayload } from '../../core/models/devis.model';

interface LineDraft {
  articleReference: string;
  designation: string;
  quantite: number;
  prixUnitaire: number | null;
  /** 0 | 1 | 2 | 5 | 10 | 15 */
  remise: number;
  stockDisponible?: number | null;
}

@Component({
  selector: 'app-devis-form-page',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './devis-form.page.html',
  styleUrl: './devis-form.page.scss',
})
export class DevisFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly devisApi = inject(DevisService);
  private readonly clientsApi = inject(ClientsService);
  private readonly articlesApi = inject(ArticlesService);

  private readonly clientSearch$ = new Subject<string>();
  private readonly articleSearch$ = new Subject<string>();
  private readonly tva = 0.2;

  /** Remises proposées à la saisie (%) */
  readonly remiseOptions = [0, 1, 2, 5, 10, 15] as const;

  /** Nombre d'articles affichés dans la recherche (au-delà : affiner la saisie). */
  private readonly articlesParRecherche = 30;

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly clientHits = signal<Client[]>([]);
  readonly articleHits = signal<Article[]>([]);
  /** Nombre total d'articles correspondant à la recherche (peut dépasser ceux affichés). */
  readonly articleTotal = signal(0);
  /** N° du devis modifié ; vide = création. */
  readonly editPiece = signal('');

  clientNumero = '';
  clientLabel = '';
  clientQuery = '';
  articleQuery = '';
  reference = '';
  date = new Date().toISOString().slice(0, 10);
  lines: LineDraft[] = [];

  constructor() {
    this.clientSearch$
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.searchClients(q));
    this.articleSearch$
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.searchArticles(q));
  }

  ngOnInit(): void {
    const piece = this.route.snapshot.paramMap.get('numeroPiece') || '';
    if (!piece) {
      this.addLine();
      return;
    }
    this.editPiece.set(piece);
    this.chargerDevis(piece);
  }

  /** Modification : reprend l'en-tête et les lignes du devis existant. */
  private chargerDevis(piece: string): void {
    this.loading.set(true);
    this.devisApi.get(piece).subscribe({
      next: (d) => {
        const e = d.entete;
        this.clientNumero = e.clientNumero ?? '';
        this.clientLabel = e.clientIntitule || e.clientNumero || '';
        this.reference = e.reference ?? '';
        if (e.dateDocument) this.date = String(e.dateDocument).slice(0, 10);
        this.lines = d.lignes
          .filter((l) => l.articleReference)
          .map((l) => ({
            articleReference: l.articleReference,
            designation: l.designation || l.articleReference,
            quantite: Number(l.quantite) || 1,
            prixUnitaire: l.prixUnitaire ?? null,
            remise: Number(l.remisePourcent) || 0,
            stockDisponible: null,
          }));
        if (this.lines.length === 0) this.addLine();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Devis introuvable');
      },
    });
  }

  boutonLibelle(): string {
    if (this.editPiece()) return this.saving() ? 'Enregistrement…' : 'Enregistrer les modifications';
    return this.saving() ? 'Création…' : 'Créer le devis';
  }

  /** Remises proposées, plus la remise déjà saisie sur la ligne si elle n'est pas dans la liste. */
  remisesPour(l: LineDraft): number[] {
    const base: number[] = [...this.remiseOptions];
    return base.includes(l.remise) ? base : [...base, l.remise].sort((a, b) => a - b);
  }

  onClientType(): void {
    this.clientSearch$.next(this.clientQuery.trim());
  }

  onArticleType(): void {
    this.articleSearch$.next(this.articleQuery.trim());
  }

  pickClient(c: Client): void {
    this.clientNumero = c.numero;
    this.clientLabel = c.intitule;
    this.clientQuery = '';
    this.clientHits.set([]);
  }

  clearClient(): void {
    this.clientNumero = '';
    this.clientLabel = '';
  }

  /** Ajoute / remplit une ligne en haut de liste */
  pickArticle(a: Article): void {
    const emptyIdx = this.lines.findIndex((l) => !l.articleReference);
    const line: LineDraft = {
      articleReference: a.reference,
      designation: a.designation || a.reference,
      quantite: 1,
      prixUnitaire: a.prixVente ?? null,
      remise: 0,
      stockDisponible: a.stockDisponible ?? a.stockTotal ?? null,
    };
    if (emptyIdx >= 0) {
      const next = [...this.lines];
      next.splice(emptyIdx, 1);
      this.lines = [line, ...next];
    } else {
      this.lines = [line, ...this.lines];
    }
    this.articleQuery = '';
    this.articleHits.set([]);
    this.articleTotal.set(0);
  }

  /** Nouvelle ligne vide en tête de tableau */
  addLine(): void {
    this.lines = [
      {
        articleReference: '',
        designation: '',
        quantite: 1,
        prixUnitaire: null,
        remise: 0,
        stockDisponible: null,
      },
      ...this.lines,
    ];
  }

  removeLine(i: number): void {
    this.lines = this.lines.filter((_, idx) => idx !== i);
    if (this.lines.length === 0) this.addLine();
  }

  lineHt(l: LineDraft): number {
    const q = Number(l.quantite) || 0;
    const p = Number(l.prixUnitaire) || 0;
    const r = Number(l.remise) || 0;
    return q * p * (1 - r / 100);
  }

  lineTtc(l: LineDraft): number {
    return this.lineHt(l) * (1 + this.tva);
  }

  totalHt(): number {
    return this.lines.reduce((s, l) => s + this.lineHt(l), 0);
  }

  totalTtc(): number {
    return this.lines.reduce((s, l) => s + this.lineTtc(l), 0);
  }

  formatAr(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
  }

  stockOf(a: Article): number | null {
    const n = a.stockDisponible ?? a.stockTotal;
    if (n == null || !Number.isFinite(Number(n))) return null;
    return Number(n);
  }

  stockClass(qty: number | null | undefined): string {
    const n = qty ?? 0;
    if (n <= 0) return 'is-out';
    if (n <= 5) return 'is-low';
    return 'is-ok';
  }

  save(): void {
    const lignes: DevisLignePayload[] = this.lines
      .filter((l) => l.articleReference.trim() && Number(l.quantite) > 0)
      .map((l) => {
        const row: DevisLignePayload = {
          articleReference: l.articleReference.trim(),
          quantite: Number(l.quantite),
        };
        if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
          row.prixUnitaire = Number(l.prixUnitaire);
        }
        const remise = Number(l.remise);
        if (remise > 0) row.remise = remise;
        return row;
      });

    if (!this.clientNumero) {
      this.error.set('Choisissez un client.');
      return;
    }
    if (lignes.length === 0) {
      this.error.set('Ajoutez au moins une ligne article.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const piece = this.editPiece();
    if (piece) {
      this.devisApi
        .update(piece, { reference: this.reference.trim(), date: this.date || null, lignes })
        .subscribe({
          next: () => {
            this.saving.set(false);
            void this.router.navigate(['/vente/devis', piece]);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err?.message || 'Modification impossible');
          },
        });
      return;
    }

    this.devisApi
      .create({
        clientNumero: this.clientNumero.trim(),
        ...(this.reference.trim() ? { reference: this.reference.trim() } : {}),
        ...(this.date ? { date: this.date } : {}),
        lignes,
      })
      .subscribe({
        next: (piece) => {
          this.saving.set(false);
          if (piece) void this.router.navigate(['/vente/devis', piece]);
          else void this.router.navigate(['/vente/devis']);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.message || 'Création impossible');
        },
      });
  }

  private searchClients(q: string): void {
    if (q.length < 2) {
      this.clientHits.set([]);
      return;
    }
    this.clientsApi.list({ search: q, page: 1, pageSize: 8 }).subscribe({
      next: (data) => this.clientHits.set(data.items ?? []),
      error: () => this.clientHits.set([]),
    });
  }

  private searchArticles(q: string): void {
    if (q.length < 2) {
      this.articleHits.set([]);
      this.articleTotal.set(0);
      return;
    }
    // Plusieurs mots possibles (« toiture bleu 3m ») : l'API exige chacun d'eux.
    this.articlesApi.list({ search: q, page: 1, pageSize: this.articlesParRecherche }).subscribe({
      next: (data) => {
        this.articleHits.set(data.items ?? []);
        this.articleTotal.set(data.total ?? data.items?.length ?? 0);
      },
      error: () => {
        this.articleHits.set([]);
        this.articleTotal.set(0);
      },
    });
  }
}

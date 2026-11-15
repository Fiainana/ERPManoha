import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AchatsService } from '../../core/services/achats.service';
import { ArticlesService } from '../../core/services/articles.service';
import { FournisseursService } from '../../core/services/fournisseurs.service';
import { Article } from '../../core/models/article.model';
import { Fournisseur } from '../../core/models/fournisseur.model';
import { ArPipe, QtePipe, aujourdhuiIso } from './achats-commun';
import { AchatsCreerArticleDialog, AchatsCreerFournisseurDialog } from './achats-dialogs';

interface Ligne {
  articleReference: string;
  designation: string;
  quantite: number | null;
  prixUnitaire: number | null;
}

/**
 * Saisie d'une demande d'achat, pensée pour le clavier : on cherche le fournisseur puis les articles,
 * ↑ ↓ pour choisir, Entrée pour valider, la quantité reçoit le focus, Entrée revient à la recherche.
 * Un fournisseur ou un article absent de Sage se crée sans quitter l'écran.
 */
@Component({
  selector: 'app-achats-demande-form-page',
  imports: [RouterLink, FormsModule, ArPipe, QtePipe, AchatsCreerArticleDialog, AchatsCreerFournisseurDialog],
  templateUrl: './achats-demande-form.page.html',
  styleUrl: './achats.shared.scss',
  host: { '(document:keydown.control.enter)': 'enregistrer()' },
})
export class AchatsDemandeFormPage implements OnInit {
  private readonly api = inject(AchatsService);
  private readonly articlesApi = inject(ArticlesService);
  private readonly fournisseursApi = inject(FournisseursService);
  private readonly router = inject(Router);
  private readonly hote = inject(ElementRef<HTMLElement>);

  private readonly rechercheFournisseur$ = new Subject<string>();
  private readonly rechercheArticle$ = new Subject<string>();
  private readonly champFournisseur = viewChild<ElementRef<HTMLInputElement>>('champFournisseur');
  private readonly champArticle = viewChild<ElementRef<HTMLInputElement>>('champArticle');

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly depots = signal<{ no: number; intitule: string }[]>([]);

  readonly fournisseurs = signal<Fournisseur[]>([]);
  readonly fournisseursCherches = signal(false);
  readonly fournisseurActif = signal(0);
  readonly articles = signal<Article[]>([]);
  readonly articlesTotal = signal(0);
  readonly articlesCherches = signal(false);
  readonly articleActif = signal(0);
  readonly creation = signal<'fournisseur' | 'article' | null>(null);

  fournisseur: { numero: string; intitule: string } | null = null;
  saisieFournisseur = '';
  saisieArticle = '';
  depotNo: number | null = null;
  date = aujourdhuiIso();
  dateLivraison = '';
  reference = '';
  /** Prête à être commandée : statut 2 dès la création. */
  validee = true;
  lignes: Ligne[] = [];

  constructor() {
    this.rechercheFournisseur$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) =>
          q.length < 2
            ? of(null)
            : this.fournisseursApi.list({ search: q, page: 1, pageSize: 8 }).pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((r) => {
        this.fournisseurs.set(r?.items ?? []);
        this.fournisseursCherches.set(r != null);
        this.fournisseurActif.set(0);
      });

    this.rechercheArticle$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) =>
          q.length < 2
            ? of(null)
            : this.articlesApi.list({ search: q, page: 1, pageSize: 20 }).pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((r) => {
        this.articles.set(r?.items ?? []);
        this.articlesTotal.set(r?.total ?? 0);
        this.articlesCherches.set(r != null);
        this.articleActif.set(0);
      });
  }

  ngOnInit(): void {
    this.api.referentielArticle().subscribe({
      next: (r) => {
        this.depots.set(r.depots ?? []);
        this.depotNo ??= r.depots?.[0]?.no ?? null;
      },
      error: () => this.depots.set([]),
    });
    setTimeout(() => this.champFournisseur()?.nativeElement.focus());
  }

  // —— Fournisseur ——

  surSaisieFournisseur(): void {
    this.rechercheFournisseur$.next(this.saisieFournisseur.trim());
  }

  /** ↑ ↓ parcourent la liste (dernier rang = « créer ») ; Entrée valide ; Échap ferme. */
  toucheFournisseur(e: KeyboardEvent): void {
    if (!this.fournisseursCherches() || e.ctrlKey || e.metaKey) return;
    const dernier = this.fournisseurs().length;
    if (e.key === 'ArrowDown') this.fournisseurActif.set(Math.min(this.fournisseurActif() + 1, dernier));
    else if (e.key === 'ArrowUp') this.fournisseurActif.set(Math.max(this.fournisseurActif() - 1, 0));
    else if (e.key === 'Enter') {
      const f = this.fournisseurs()[this.fournisseurActif()];
      if (f) this.choisirFournisseur(f);
      else this.creation.set('fournisseur');
    } else if (e.key === 'Escape') this.fermerFournisseurs();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  choisirFournisseur(f: { numero: string; intitule: string | null }): void {
    this.fournisseur = { numero: f.numero, intitule: f.intitule || f.numero };
    this.saisieFournisseur = '';
    this.fermerFournisseurs();
    setTimeout(() => this.champArticle()?.nativeElement.focus());
  }

  changerFournisseur(): void {
    this.fournisseur = null;
    setTimeout(() => this.champFournisseur()?.nativeElement.focus());
  }

  private fermerFournisseurs(): void {
    this.fournisseurs.set([]);
    this.fournisseursCherches.set(false);
    this.rechercheFournisseur$.next('');
  }

  surFournisseurCree(f: { numero: string; intitule: string }): void {
    this.creation.set(null);
    this.choisirFournisseur(f);
  }

  // —— Articles ——

  surSaisieArticle(): void {
    this.rechercheArticle$.next(this.saisieArticle.trim());
  }

  toucheArticle(e: KeyboardEvent): void {
    if (!this.articlesCherches() || e.ctrlKey || e.metaKey) return;
    const dernier = this.articles().length;
    if (e.key === 'ArrowDown') this.articleActif.set(Math.min(this.articleActif() + 1, dernier));
    else if (e.key === 'ArrowUp') this.articleActif.set(Math.max(this.articleActif() - 1, 0));
    else if (e.key === 'Enter') {
      const a = this.articles()[this.articleActif()];
      if (a) this.ajouterArticle(a.reference, a.designation || a.reference, a.prixAchat ?? null);
      else this.creation.set('article');
    } else if (e.key === 'Escape') this.fermerArticles();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /** Ajoute la ligne (ou augmente la quantité si l'article y est déjà) et place le curseur sur la quantité. */
  ajouterArticle(reference: string, designation: string, prixAchat: number | null): void {
    let index = this.lignes.findIndex((l) => l.articleReference.toLowerCase() === reference.toLowerCase());
    if (index >= 0) {
      this.lignes[index].quantite = (Number(this.lignes[index].quantite) || 0) + 1;
    } else {
      this.lignes = [...this.lignes, { articleReference: reference, designation, quantite: 1, prixUnitaire: prixAchat }];
      index = this.lignes.length - 1;
    }
    this.saisieArticle = '';
    this.fermerArticles();
    this.focusLigne(index);
  }

  private fermerArticles(): void {
    this.articles.set([]);
    this.articlesTotal.set(0);
    this.articlesCherches.set(false);
    this.rechercheArticle$.next('');
  }

  surArticleCree(a: { reference: string; designation: string; prixAchat: number }): void {
    this.creation.set(null);
    this.ajouterArticle(a.reference, a.designation, a.prixAchat || null);
  }

  annulerCreation(): void {
    const quoi = this.creation();
    this.creation.set(null);
    setTimeout(() => (quoi === 'fournisseur' ? this.champFournisseur() : this.champArticle())?.nativeElement.focus());
  }

  retirer(i: number): void {
    this.lignes = this.lignes.filter((_, k) => k !== i);
  }

  /** Entrée dans une quantité ou un prix : retour à la recherche pour l'article suivant. */
  retourRecherche(e: Event): void {
    e.preventDefault();
    this.champArticle()?.nativeElement.focus();
  }

  private focusLigne(index: number): void {
    setTimeout(() => {
      const champ = this.hote.nativeElement.querySelector(`#qte-${index}`) as HTMLInputElement | null;
      champ?.focus();
      champ?.select();
    });
  }

  montant(l: Ligne): number {
    return (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0);
  }

  totalHt(): number {
    return this.lignes.reduce((s, l) => s + this.montant(l), 0);
  }

  // —— Enregistrement ——

  enregistrer(): void {
    if (this.saving() || this.creation()) return;
    if (!this.fournisseur) {
      this.error.set('Choisissez un fournisseur.');
      this.champFournisseur()?.nativeElement.focus();
      return;
    }
    if (this.lignes.length === 0) {
      this.error.set('Ajoutez au moins un article.');
      this.champArticle()?.nativeElement.focus();
      return;
    }
    const sansQuantite = this.lignes.findIndex((l) => !(Number(l.quantite) > 0));
    if (sansQuantite >= 0) {
      this.error.set(`Indiquez la quantité de « ${this.lignes[sansQuantite].designation} ».`);
      this.focusLigne(sansQuantite);
      return;
    }
    if (this.dateLivraison && this.date && this.dateLivraison < this.date) {
      this.error.set('La date de livraison est avant la date de la demande.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.api
      .creerDemande({
        fournisseurCode: this.fournisseur.numero,
        depotNo: this.depotNo,
        date: this.date || null,
        dateLivraison: this.dateLivraison || null,
        reference: this.reference.trim() || null,
        statut: this.validee ? 2 : 0,
        lignes: this.lignes.map((l) => ({
          articleReference: l.articleReference,
          quantite: Number(l.quantite),
          prixUnitaire: l.prixUnitaire != null && String(l.prixUnitaire) !== '' ? Number(l.prixUnitaire) : null,
        })),
      })
      .subscribe({
        next: (r) => {
          this.saving.set(false);
          this.api.flash.set(r.message);
          void this.router.navigate(['/achats', 'demandes', r.numeroPiece]);
        },
        error: (e: Error) => {
          this.saving.set(false);
          this.error.set(e.message);
        },
      });
  }
}

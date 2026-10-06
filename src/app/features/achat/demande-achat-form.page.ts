import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemandesAchatService } from '../../core/services/demandes-achat.service';
import { ArticlesService } from '../../core/services/articles.service';
import { Article } from '../../core/models/article.model';

interface LineDraft {
  /** mode: existing article OR free designation */
  articleReference: string;
  designation: string;
  quantite: number;
  isNew: boolean;
}

@Component({
  selector: 'app-demande-achat-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './demande-achat-form.page.html',
  styleUrl: './demande-achat-form.page.scss',
})
export class DemandeAchatFormPage {
  private readonly api = inject(DemandesAchatService);
  private readonly articlesApi = inject(ArticlesService);
  private readonly router = inject(Router);
  private readonly articleSearch$ = new Subject<string>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly articleHits = signal<Article[]>([]);

  note = '';
  articleQuery = '';
  lines: LineDraft[] = [
    { articleReference: '', designation: '', quantite: 1, isNew: false },
  ];

  constructor() {
    this.articleSearch$
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.searchArticles(q));
  }

  onArticleType(): void {
    this.articleSearch$.next(this.articleQuery.trim());
  }

  pickArticle(a: Article): void {
    const emptyIdx = this.lines.findIndex((l) => !l.articleReference && !l.designation);
    const line: LineDraft = {
      articleReference: a.reference,
      designation: a.designation || a.reference,
      quantite: 1,
      isNew: false,
    };
    if (emptyIdx >= 0) {
      const next = [...this.lines];
      next[emptyIdx] = line;
      this.lines = next;
    } else {
      this.lines = [line, ...this.lines];
    }
    this.articleQuery = '';
    this.articleHits.set([]);
  }

  addLineSage(): void {
    this.lines = [
      { articleReference: '', designation: '', quantite: 1, isNew: false },
      ...this.lines,
    ];
  }

  addLineNew(): void {
    this.lines = [
      { articleReference: '', designation: '', quantite: 1, isNew: true },
      ...this.lines,
    ];
  }

  removeLine(i: number): void {
    this.lines = this.lines.filter((_, idx) => idx !== i);
    if (this.lines.length === 0) this.addLineSage();
  }

  submit(): void {
    if (this.saving()) return;

    const lignes = this.lines
      .filter((l) => {
        if (l.isNew) return !!l.designation.trim() && Number(l.quantite) > 0;
        return !!l.articleReference.trim() && Number(l.quantite) > 0;
      })
      .map((l) => {
        if (l.isNew) {
          return {
            designation: l.designation.trim(),
            quantite: Number(l.quantite),
          };
        }
        return {
          articleReference: l.articleReference.trim(),
          designation: l.designation.trim() || undefined,
          quantite: Number(l.quantite),
        };
      });

    if (lignes.length === 0) {
      this.error.set(
        'Ajoute au moins une ligne : article Sage existant ou nouvelle désignation.'
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api
      .create({
        note: this.note.trim() || null,
        lignes,
      })
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          if (detail?.id) void this.router.navigate(['/achat/demandes-achat', detail.id]);
          else void this.router.navigate(['/achat/demandes-achat']);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.message || 'Création impossible');
        },
      });
  }

  private searchArticles(q: string): void {
    if (q.length < 2) {
      this.articleHits.set([]);
      return;
    }
    this.articlesApi.list({ search: q, page: 1, pageSize: 10 }).subscribe({
      next: (data) => this.articleHits.set(data.items ?? []),
      error: () => this.articleHits.set([]),
    });
  }
}

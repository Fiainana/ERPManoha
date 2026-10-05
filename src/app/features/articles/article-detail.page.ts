import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ArticlesService } from '../../core/services/articles.service';
import { AuthService } from '../../core/services/auth.service';
import { Article, ArticleStockDepot } from '../../core/models/article.model';

@Component({
  selector: 'app-article-detail-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './article-detail.page.html',
  styleUrl: './article-detail.page.scss',
})
export class ArticleDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articlesApi = inject(ArticlesService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly article = signal<Article | null>(null);
  readonly stockDisponible = signal(0);
  readonly stocks = signal<ArticleStockDepot[]>([]);

  ngOnInit(): void {
    const reference = this.route.snapshot.paramMap.get('reference');
    if (!reference) {
      void this.router.navigate(['/articles']);
      return;
    }
    this.load(reference);
  }

  load(reference: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.articlesApi.getByReference(reference).subscribe({
      next: (data) => {
        this.article.set(data.article);
        this.stockDisponible.set(
          data.stockDisponible ?? data.article.stockDisponible ?? 0
        );
        this.stocks.set(data.stocksParDepot ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Article introuvable');
      },
    });
  }
}

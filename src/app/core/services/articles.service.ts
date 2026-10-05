import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  Article,
  ArticleDetailResult,
  ArticleListParams,
  ArticleListResult,
  ArticleStockDepot,
} from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/articles`;

  list(params: ArticleListParams = {}) {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.depotNo != null) httpParams = httpParams.set('depotNo', String(params.depotNo));
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.pageSize) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params.inclureSommeil) httpParams = httpParams.set('inclureSommeil', 'true');

    return this.http.get<ApiResponse<ArticleListResult>>(this.base, { params: httpParams }).pipe(
      map((res) => {
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Impossible de charger les articles');
        }
        return this.normalizeList(res.data as unknown as Record<string, unknown>);
      })
    );
  }

  getByReference(reference: string) {
    return this.http
      .get<ApiResponse<ArticleDetailResult>>(`${this.base}/${encodeURIComponent(reference)}`)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Article introuvable');
          }
          return this.normalizeDetail(res.data as unknown as Record<string, unknown>);
        })
      );
  }

  private normalizeList(raw: Record<string, unknown>): ArticleListResult {
    const items = (raw['items'] || raw['Items'] || []) as Record<string, unknown>[];
    return {
      page: Number(raw['page'] ?? raw['Page'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 25),
      total: Number(raw['total'] ?? raw['Total'] ?? 0),
      totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
      depotNo: (raw['depotNo'] ?? raw['DepotNo']) as number | null,
      items: items.map((row) => this.normalizeArticle(row)),
    };
  }

  private normalizeDetail(raw: Record<string, unknown>): ArticleDetailResult {
    const articleRaw = (raw['article'] || raw['Article'] || raw) as Record<string, unknown>;
    const stocks = (raw['stocksParDepot'] || raw['StocksParDepot'] || []) as Record<
      string,
      unknown
    >[];
    return {
      article: this.normalizeArticle(articleRaw),
      stockTotal: (raw['stockTotal'] ?? raw['StockTotal']) as number | null,
      stockReserve: (raw['stockReserve'] ?? raw['StockReserve']) as number | null,
      stockCommande: (raw['stockCommande'] ?? raw['StockCommande']) as number | null,
      stockDisponible: (raw['stockDisponible'] ?? raw['StockDisponible']) as number | null,
      stocksParDepot: stocks.map((s) => this.normalizeStock(s)),
    };
  }

  private normalizeArticle(row: Record<string, unknown>): Article {
    return {
      reference: String(row['reference'] ?? row['Reference'] ?? ''),
      designation: (row['designation'] ?? row['Designation']) as string | null,
      codeFamille: (row['codeFamille'] ?? row['CodeFamille']) as string | null,
      uniteVenteNo: (row['uniteVenteNo'] ?? row['UniteVenteNo']) as number | null,
      uniteVenteLibelle: (row['uniteVenteLibelle'] ?? row['UniteVenteLibelle']) as string | null,
      prixVente: (row['prixVente'] ?? row['PrixVente']) as number | null,
      prixAchat: (row['prixAchat'] ?? row['PrixAchat']) as number | null,
      sommeil: Boolean(row['sommeil'] ?? row['Sommeil']),
      stockTotal: (row['stockTotal'] ?? row['StockTotal']) as number | null,
      stockReserve: (row['stockReserve'] ?? row['StockReserve']) as number | null,
      stockCommande: (row['stockCommande'] ?? row['StockCommande']) as number | null,
      stockDisponible: (row['stockDisponible'] ?? row['StockDisponible']) as number | null,
    };
  }

  private normalizeStock(row: Record<string, unknown>): ArticleStockDepot {
    return {
      depotNo: Number(row['depotNo'] ?? row['DepotNo'] ?? 0),
      depotIntitule: (row['depotIntitule'] ?? row['DepotIntitule']) as string | null,
      stock: (row['stock'] ?? row['Stock']) as number | null,
      reserve: (row['reserve'] ?? row['Reserve']) as number | null,
      commande: (row['commande'] ?? row['Commande']) as number | null,
      disponible: (row['disponible'] ?? row['Disponible']) as number | null,
      principal: Boolean(row['principal'] ?? row['Principal']),
    };
  }
}

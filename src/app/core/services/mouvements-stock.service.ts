import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  DepotOption,
  MouvementStock,
  MouvementStockListParams,
  MouvementStockListResult,
} from '../models/mouvement-stock.model';

@Injectable({ providedIn: 'root' })
export class MouvementsStockService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/depot`;

  list(opts: MouvementStockListParams = {}) {
    let params = new HttpParams();
    if (opts.article) params = params.set('article', opts.article);
    if (opts.depotNo != null) params = params.set('depotNo', String(opts.depotNo));
    if (opts.dateDebut) params = params.set('dateDebut', opts.dateDebut);
    if (opts.dateFin) params = params.set('dateFin', opts.dateFin);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<unknown>>(`${this.base}/mouvements-stock`, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  listDepots(search?: string) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);

    return this.http.get<ApiResponse<unknown>>(`${this.base}/depots`, { params }).pipe(
      map((res) => this.normalizeDepots(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private unwrap(res: unknown): unknown {
    if (!res || typeof res !== 'object') return res;
    const o = res as Record<string, unknown>;
    if ('data' in o && o['data'] != null) return o['data'];
    if ('Data' in o && o['Data'] != null) return o['Data'];
    return res;
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès refusé.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API mouvements de stock';
  }

  private normalizeList(raw: unknown): MouvementStockListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 50)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalizeRow(r)),
    };
  }

  private normalizeRow(row: Record<string, unknown>): MouvementStock {
    return {
      dateMouvement: (row['dateMouvement'] ?? row['DateMouvement']) as string | null,
      domaine: this.num(row['domaine'] ?? row['Domaine']),
      typeDocument: this.num(row['typeDocument'] ?? row['TypeDocument']),
      typeLibelle: (row['typeLibelle'] ?? row['TypeLibelle']) as string | null,
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''),
      tiers: (row['tiers'] ?? row['Tiers']) as string | null,
      referenceDoc: (row['referenceDoc'] ?? row['ReferenceDoc']) as string | null,
      depotNo: this.num(row['depotNo'] ?? row['DepotNo']),
      depotIntitule: (row['depotIntitule'] ?? row['DepotIntitule']) as string | null,
      numeroLigne: this.num(row['numeroLigne'] ?? row['NumeroLigne']),
      articleReference: (row['articleReference'] ?? row['ArticleReference']) as string | null,
      designation: (row['designation'] ?? row['Designation']) as string | null,
      quantite: this.num(row['quantite'] ?? row['Quantite']),
      quantiteMouvement: this.num(row['quantiteMouvement'] ?? row['QuantiteMouvement']),
      sens: (row['sens'] ?? row['Sens']) as string | null,
    };
  }

  private normalizeDepots(raw: unknown): DepotOption[] {
    // API peut renvoyer un tableau direct ou { items: [...] }
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) {
      rows = raw as Record<string, unknown>[];
    } else if (raw && typeof raw === 'object') {
      const bag = raw as Record<string, unknown>;
      rows = (bag['items'] || bag['Items'] || bag['depots'] || bag['Depots'] || []) as Record<
        string,
        unknown
      >[];
    }
    return rows
      .map((r) => ({
        no: Number(r['no'] ?? r['No'] ?? r['deNo'] ?? r['DE_No'] ?? 0),
        intitule: String(r['intitule'] ?? r['Intitule'] ?? r['deIntitule'] ?? r['DE_Intitule'] ?? ''),
      }))
      .filter((d) => d.no > 0);
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

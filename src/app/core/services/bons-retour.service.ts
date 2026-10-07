import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  BonRetourDetail,
  BonRetourEntete,
  BonRetourLigne,
  BonRetourListParams,
  BonRetourListResult,
} from '../models/bon-retour.model';

@Injectable({ providedIn: 'root' })
export class BonsRetourService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/depot`;

  list(opts: BonRetourListParams = {}) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.aujourdhui) params = params.set('aujourdhui', 'true');
    if (opts.dateDebut) params = params.set('dateDebut', opts.dateDebut);
    if (opts.dateFin) params = params.set('dateFin', opts.dateFin);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<unknown>>(`${this.base}/bons-retour`, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  get(numeroPiece: string) {
    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/bons-retour/${encodeURIComponent(numeroPiece)}`)
      .pipe(
        map((res) => {
          const data = this.unwrap(res) as Record<string, unknown>;
          if (!data) throw new Error('Bon de retour introuvable');
          return this.normalizeDetail(data);
        }),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  /** Factures de retour (issues de la validation dépôt des bons de retour). */
  listFacturesRetour(opts: BonRetourListParams = {}) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.aujourdhui) params = params.set('aujourdhui', 'true');
    if (opts.dateDebut) params = params.set('dateDebut', opts.dateDebut);
    if (opts.dateFin) params = params.set('dateFin', opts.dateFin);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<unknown>>(`${this.base}/factures-retour`, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  getFactureRetour(numeroPiece: string) {
    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/factures-retour/${encodeURIComponent(numeroPiece)}`)
      .pipe(
        map((res) => {
          const data = this.unwrap(res) as Record<string, unknown>;
          if (!data) throw new Error('Facture de retour introuvable');
          return this.normalizeDetail(data);
        }),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  /** Valide le retour au dépôt → génère facture de retour */
  valider(numeroPiece: string) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/valider-retour`, { numeroPiece })
      .pipe(
        map((res) => this.pickFactureRetour(this.unwrap(res))),
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
    if (http?.status === 404) return 'Bon de retour introuvable.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API bons de retour';
  }

  private normalizeList(raw: unknown): BonRetourListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] ||
      bag['Items'] ||
      bag['bonsRetour'] ||
      bag['BonsRetour'] ||
      []) as Record<string, unknown>[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 25)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalizeEntete(r)),
    };
  }

  private normalizeDetail(raw: Record<string, unknown>): BonRetourDetail {
    const enteteRaw = (raw['entete'] || raw['Entete'] || raw) as Record<string, unknown>;
    const lignesRaw = (raw['lignes'] || raw['Lignes'] || []) as Record<string, unknown>[];
    return {
      entete: this.normalizeEntete(enteteRaw),
      lignes: Array.isArray(lignesRaw) ? lignesRaw.map((l) => this.normalizeLigne(l)) : [],
    };
  }

  private normalizeEntete(row: Record<string, unknown>): BonRetourEntete {
    return {
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''),
      dateDocument: (row['dateDocument'] ?? row['DateDocument']) as string | null,
      reference: (row['reference'] ?? row['Reference']) as string | null,
      clientNumero: (row['clientNumero'] ?? row['ClientNumero']) as string | null,
      clientIntitule: (row['clientIntitule'] ?? row['ClientIntitule']) as string | null,
      totalHT: this.num(row['totalHT'] ?? row['TotalHT']),
      totalTTC: this.num(row['totalTTC'] ?? row['TotalTTC']),
      representant: (row['representant'] ?? row['Representant']) as string | null,
      factureOrigine: (row['factureOrigine'] ??
        row['FactureOrigine'] ??
        row['numeroFacture'] ??
        row['NumeroFacture']) as string | null,
    };
  }

  private normalizeLigne(row: Record<string, unknown>): BonRetourLigne {
    return {
      articleReference: (row['articleReference'] ?? row['ArticleReference']) as string | null,
      designation: (row['designation'] ?? row['Designation']) as string | null,
      quantite: this.num(row['quantite'] ?? row['Quantite']),
      prixUnitaire: this.num(row['prixUnitaire'] ?? row['PrixUnitaire']),
      remisePourcent: this.num(row['remisePourcent'] ?? row['RemisePourcent']),
      montantHT: this.num(row['montantHT'] ?? row['MontantHT']),
      montantTTC: this.num(row['montantTTC'] ?? row['MontantTTC']),
    };
  }

  private pickFactureRetour(raw: unknown): string {
    if (!raw || typeof raw !== 'object') return '';
    const o = raw as Record<string, unknown>;
    const tr = (o['transformation'] || o['Transformation'] || o) as Record<string, unknown>;
    const keys = [
      'numeroPieceFacture',
      'NumeroPieceFacture',
      'numeroFacture',
      'NumeroFacture',
      'numeroPiece',
      'NumeroPiece',
    ];
    for (const k of keys) {
      const v = tr[k] ?? o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    const ticket = (o['ticket'] || o['Ticket']) as Record<string, unknown> | undefined;
    if (ticket) {
      const entete = (ticket['entete'] || ticket['Entete'] || ticket) as Record<string, unknown>;
      const n = entete['numeroPiece'] ?? entete['NumeroPiece'];
      if (typeof n === 'string' && n.trim()) return n.trim();
    }
    return '';
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

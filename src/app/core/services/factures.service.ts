import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  FactureDetail,
  FactureEntete,
  FactureLigne,
  FactureListParams,
  FactureListResult,
} from '../models/facture.model';

@Injectable({ providedIn: 'root' })
export class FacturesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/b2b/factures`;

  list(opts: FactureListParams = {}) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.client) params = params.set('client', opts.client);
    if (opts.aujourdhui) params = params.set('aujourdhui', 'true');
    if (opts.dateDebut) params = params.set('dateDebut', opts.dateDebut);
    if (opts.dateFin) params = params.set('dateFin', opts.dateFin);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));
    if (opts.mes != null) params = params.set('mes', String(opts.mes));
    if (opts.impayees) params = params.set('impayees', 'true');

    return this.http.get<ApiResponse<unknown>>(this.base, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  getByPiece(numeroPiece: string) {
    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/${encodeURIComponent(numeroPiece)}`)
      .pipe(
        map((res) => {
          const data = this.unwrap(res) as Record<string, unknown>;
          if (!data) throw new Error('Facture introuvable');
          return this.normalizeDetail(data);
        }),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  /** PDF facture — Commercial = 1 impression ; Admin = illimité */
  getPdf(numeroPiece: string) {
    return this.http
      .get(`${this.base}/${encodeURIComponent(numeroPiece)}/pdf`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((resp) => {
          const blob = resp.body;
          if (!blob || blob.size === 0) throw new Error("Document d'impression vide");
          if (blob.type && blob.type.includes('json')) {
            throw new Error('Erreur lors de la génération du document');
          }
          const cd = resp.headers.get('content-disposition') || '';
          const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(cd);
          const fileName = match
            ? decodeURIComponent(match[1].replace(/"/g, ''))
            : `Facture_${numeroPiece}.pdf`;
          return { blob, fileName };
        }),
        catchError((err) => throwError(() => new Error(this.readPrintError(err))))
      );
  }

  downloadPdf(numeroPiece: string) {
    return this.getPdf(numeroPiece).pipe(
      map(({ blob, fileName }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return fileName;
      })
    );
  }

  /** Ouvre le PDF et tente l'impression navigateur */
  openPrint(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* viewer natif */
      }
    }, 800);
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
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
    if (http?.status === 403) return 'Accès refusé sur cette facture.';
    if (http?.status === 404) return 'Facture introuvable.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API factures';
  }

  private readPrintError(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.status === 403) {
      return 'Impression déjà effectuée. Seul un administrateur peut réimprimer.';
    }
    if (http?.status === 404) return 'Facture introuvable';
    if (http?.error instanceof Blob) {
      return http.status === 403
        ? 'Impression déjà effectuée. Seul un administrateur peut réimprimer.'
        : `Erreur impression (${http.status})`;
    }
    return this.readError(err);
  }

  private normalizeList(raw: unknown): FactureListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] ||
      bag['Items'] ||
      bag['factures'] ||
      bag['Factures'] ||
      []) as Record<string, unknown>[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 25)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalizeEntete(r)),
    };
  }

  private normalizeDetail(raw: Record<string, unknown>): FactureDetail {
    const enteteRaw = (raw['entete'] || raw['Entete'] || raw) as Record<string, unknown>;
    const lignesRaw = (raw['lignes'] || raw['Lignes'] || []) as Record<string, unknown>[];
    return {
      entete: this.normalizeEntete(enteteRaw),
      lignes: Array.isArray(lignesRaw) ? lignesRaw.map((l) => this.normalizeLigne(l)) : [],
    };
  }

  private normalizeEntete(row: Record<string, unknown>): FactureEntete {
    return {
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''),
      dateDocument: (row['dateDocument'] ?? row['DateDocument']) as string | null,
      reference: (row['reference'] ?? row['Reference']) as string | null,
      clientNumero: (row['clientNumero'] ?? row['ClientNumero'] ?? row['numeroClient']) as
        | string
        | null,
      clientIntitule: (row['clientIntitule'] ?? row['ClientIntitule'] ?? row['intitule']) as
        | string
        | null,
      totalHT: this.num(row['totalHT'] ?? row['TotalHT']),
      totalTTC: this.num(row['totalTTC'] ?? row['TotalTTC']),
      netAPayer: this.num(row['netAPayer'] ?? row['NetAPayer']),
      montantRegle: this.num(row['montantRegle'] ?? row['MontantRegle']),
      resteAPayer: this.num(row['resteAPayer'] ?? row['ResteAPayer']),
      representant: (row['representant'] ?? row['Representant']) as string | null,
      dejaImprimee: Boolean(row['dejaImprimee'] ?? row['DejaImprimee']),
    };
  }

  private normalizeLigne(row: Record<string, unknown>): FactureLigne {
    return {
      articleReference: (row['articleReference'] ?? row['ArticleReference']) as string | null,
      reference: (row['articleReference'] ?? row['ArticleReference'] ?? row['reference']) as
        | string
        | null,
      designation: (row['designation'] ?? row['Designation']) as string | null,
      quantite: this.num(row['quantite'] ?? row['Quantite']),
      prixUnitaire: this.num(row['prixUnitaire'] ?? row['PrixUnitaire']),
      remisePourcent: this.num(row['remisePourcent'] ?? row['RemisePourcent']),
      remise: this.num(row['remisePourcent'] ?? row['RemisePourcent'] ?? row['remise']),
      montantHT: this.num(row['montantHT'] ?? row['MontantHT']),
      montantTTC: this.num(row['montantTTC'] ?? row['MontantTTC']),
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

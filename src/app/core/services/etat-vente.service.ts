import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { EtatVenteItem, EtatVenteResult, EtatVenteScope } from '../models/etat-vente.model';

@Injectable({ providedIn: 'root' })
export class EtatVenteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/factures/etat-vente`;

  getListe(scope: EtatVenteScope, date: string) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/${scope}`, { date })
      .pipe(
        map((res) => this.normalize(this.unwrap(res))),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  downloadPdf(scope: EtatVenteScope, date: string) {
    return this.http
      .post(`${this.base}/${scope}/pdf`, { date }, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((resp) => {
          const blob = resp.body;
          if (!blob || blob.size === 0) throw new Error('PDF vide');
          if (blob.type && blob.type.includes('json')) {
            throw new Error('Erreur lors de la génération du PDF');
          }
          const cd = resp.headers.get('content-disposition') || '';
          const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(cd);
          const fileName = match
            ? decodeURIComponent(match[1].replace(/"/g, ''))
            : `Etat-vente-${scope}-${date}.pdf`;
          return { blob, fileName };
        }),
        map(({ blob, fileName }) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          return fileName;
        }),
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

  private normalize(raw: unknown): EtatVenteResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    return {
      scope: String(bag['scope'] ?? bag['Scope'] ?? ''),
      titre: String(bag['titre'] ?? bag['Titre'] ?? 'État de vente'),
      date: String(bag['date'] ?? bag['Date'] ?? ''),
      clientComptoir: (bag['clientComptoir'] ?? bag['ClientComptoir']) as string | null,
      count: Number(bag['count'] ?? bag['Count'] ?? rows.length),
      totalHT: this.num(bag['totalHT'] ?? bag['TotalHT']) ?? 0,
      totalTTC: this.num(bag['totalTTC'] ?? bag['TotalTTC']) ?? 0,
      totalRegle: this.num(bag['totalRegle'] ?? bag['TotalRegle']) ?? 0,
      totalReste: this.num(bag['totalReste'] ?? bag['TotalReste']) ?? 0,
      items: rows.map((r) => this.normalizeItem(r)),
    };
  }

  private normalizeItem(row: Record<string, unknown>): EtatVenteItem {
    return {
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''),
      dateDocument: (row['dateDocument'] ?? row['DateDocument']) as string | null,
      clientNumero: (row['clientNumero'] ?? row['ClientNumero']) as string | null,
      clientIntitule: (row['clientIntitule'] ?? row['ClientIntitule']) as string | null,
      nomClient: (row['nomClient'] ?? row['NomClient']) as string | null,
      numClient: (row['numClient'] ?? row['NumClient']) as string | null,
      clientAffiche: (row['clientAffiche'] ?? row['ClientAffiche']) as string | null,
      telephone: (row['telephone'] ?? row['Telephone']) as string | null,
      representant: (row['representant'] ?? row['Representant']) as string | null,
      reference: (row['reference'] ?? row['Reference']) as string | null,
      totalHT: this.num(row['totalHT'] ?? row['TotalHT']),
      totalTTC: this.num(row['totalTTC'] ?? row['TotalTTC']),
      montantRegle: this.num(row['montantRegle'] ?? row['MontantRegle']),
      resteAPayer: this.num(row['resteAPayer'] ?? row['ResteAPayer']),
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.error instanceof Blob) {
      return http.status === 403
        ? 'Accès refusé (Admin requis).'
        : `Erreur (${http.status})`;
    }
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès réservé aux administrateurs.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur état de vente';
  }
}

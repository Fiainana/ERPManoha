import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  BcAchatDetail,
  BcAchatEntete,
  BcAchatLigne,
  BcAchatListResult,
  BcAchatReste,
} from '../models/bc-achat.model';

/** Documents achat admin : BC / BL / FA via /api/admin/achats */
@Injectable({ providedIn: 'root' })
export class AdminAchatsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/achats`;

  listCommandes(opts: { search?: string; page?: number; pageSize?: number } = {}) {
    return this.listDocs('commandes', opts);
  }

  listReceptions(opts: { search?: string; page?: number; pageSize?: number } = {}) {
    return this.listDocs('receptions', opts);
  }

  listFactures(opts: { search?: string; page?: number; pageSize?: number } = {}) {
    return this.listDocs('factures', opts);
  }

  listPreparations(opts: { search?: string; page?: number; pageSize?: number } = {}) {
    return this.listDocs('preparations', opts);
  }

  getCommande(piece: string) {
    return this.getDoc('commandes', piece);
  }

  getReception(piece: string) {
    return this.getDoc('receptions', piece);
  }

  getFacture(piece: string) {
    return this.getDoc('factures', piece);
  }

  getPreparation(piece: string) {
    return this.getDoc('preparations', piece);
  }

  /** BL → FA fournisseur */
  facturerReception(numeroPiece: string) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/receptions/facturer`, { numeroPiece })
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  private listDocs(
    kind: 'commandes' | 'receptions' | 'factures' | 'preparations',
    opts: { search?: string; page?: number; pageSize?: number }
  ) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<unknown>>(`${this.base}/${kind}`, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private getDoc(kind: 'commandes' | 'receptions' | 'factures' | 'preparations', piece: string) {
    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/${kind}/${encodeURIComponent(piece)}`)
      .pipe(
        map((res) => {
          const data = this.unwrap(res) as Record<string, unknown>;
          if (!data) throw new Error('Document introuvable');
          return this.normalizeDetail(data);
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

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès réservé aux administrateurs.';
    if (http?.status === 404) return 'Document introuvable.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API admin achats';
  }

  private normalizeList(raw: unknown): BcAchatListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || bag['documents'] || bag['Documents'] || []) as Record<
      string,
      unknown
    >[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 40)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalizeEntete(r)),
    };
  }

  private normalizeDetail(raw: Record<string, unknown>): BcAchatDetail {
    const enteteRaw = (raw['entete'] || raw['Entete'] || raw) as Record<string, unknown>;
    const lignesRaw = (raw['lignes'] || raw['Lignes'] || []) as Record<string, unknown>[];
    const resteRaw = (raw['resteARecevoir'] || raw['ResteARecevoir'] || null) as Record<
      string,
      unknown
    > | null;

    return {
      entete: this.normalizeEntete(enteteRaw),
      lignes: Array.isArray(lignesRaw) ? lignesRaw.map((l) => this.normalizeLigne(l)) : [],
      resteARecevoir: resteRaw
        ? {
            totalQuantiteReste: Number(
              resteRaw['totalQuantiteReste'] ?? resteRaw['TotalQuantiteReste'] ?? 0
            ),
            completementLivre: Boolean(
              resteRaw['completementLivre'] ?? resteRaw['CompletementLivre'] ?? false
            ),
            message: (resteRaw['message'] ?? resteRaw['Message']) as string | null,
          }
        : null,
    };
  }

  private normalizeEntete(row: Record<string, unknown>): BcAchatEntete {
    return {
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? row['doPiece'] ?? ''),
      typeDocument: this.num(row['typeDocument'] ?? row['TypeDocument'] ?? row['doType']),
      typeLibelle: (row['typeLibelle'] ?? row['TypeLibelle']) as string | null,
      dateDocument: (row['dateDocument'] ?? row['DateDocument'] ?? row['doDate']) as string | null,
      fournisseurCode: (row['fournisseurCode'] ??
        row['FournisseurCode'] ??
        row['doTiers'] ??
        row['tiers']) as string | null,
      fournisseurIntitule: (row['fournisseurIntitule'] ??
        row['FournisseurIntitule'] ??
        row['tiersIntitule'] ??
        row['TiersIntitule']) as string | null,
      totalHT: this.num(row['totalHT'] ?? row['TotalHT']),
      totalTTC: this.num(row['totalTTC'] ?? row['TotalTTC']),
      reference: (row['reference'] ?? row['Reference'] ?? row['doRef']) as string | null,
      depotNo: this.num(row['depotNo'] ?? row['DepotNo'] ?? row['deNo']),
      depotIntitule: (row['depotIntitule'] ?? row['DepotIntitule']) as string | null,
      statut: this.num(row['statut'] ?? row['Statut'] ?? row['doStatut']),
    };
  }

  private normalizeLigne(row: Record<string, unknown>): BcAchatLigne {
    return {
      numeroLigne: Number(row['numeroLigne'] ?? row['NumeroLigne'] ?? row['dlNo'] ?? 0),
      articleReference: (row['articleReference'] ?? row['ArticleReference'] ?? row['arRef']) as
        | string
        | null,
      designation: (row['designation'] ?? row['Designation']) as string | null,
      quantite: this.num(row['quantite'] ?? row['Quantite'] ?? row['dlQte']),
      quantiteLivree: this.num(row['quantiteLivree'] ?? row['QuantiteLivree'] ?? row['dlQteBL']),
      quantiteResteARecevoir: this.num(
        row['quantiteResteARecevoir'] ?? row['QuantiteResteARecevoir']
      ),
      prixUnitaire: this.num(row['prixUnitaire'] ?? row['PrixUnitaire']),
      montantHT: this.num(row['montantHT'] ?? row['MontantHT']),
      montantTTC: this.num(row['montantTTC'] ?? row['MontantTTC']),
      remisePourcent: this.num(row['remisePourcent'] ?? row['RemisePourcent']),
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

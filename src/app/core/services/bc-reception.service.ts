import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  BcAchatDetail,
  BcAchatEntete,
  BcAchatLigne,
  BcAchatListParams,
  BcAchatListResult,
  BcAchatReste,
  ReceptionResult,
  ReceptionnerPayload,
} from '../models/bc-achat.model';

@Injectable({ providedIn: 'root' })
export class BcReceptionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/depot/achats`;

  listCommandes(opts: BcAchatListParams = {}) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/commandes`, { params })
      .pipe(
        map((res) => this.normalizeList(this.unwrap(res))),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  getCommande(piece: string) {
    return this.http
      .get<ApiResponse<unknown>>(`${this.base}/commandes/${encodeURIComponent(piece)}`)
      .pipe(
        map((res) => {
          const data = this.unwrap(res) as Record<string, unknown>;
          if (!data) throw new Error('Commande fournisseur introuvable');
          return this.normalizeDetail(data);
        }),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  /** BC → BL (réception totale si body vide, partielle si lignes) */
  receptionner(piece: string, body?: ReceptionnerPayload) {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.base}/commandes/${encodeURIComponent(piece)}/receptionner`,
        body ?? {}
      )
      .pipe(
        map((res) => this.normalizeReception(this.unwrap(res))),
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
    if (http?.status === 404) return 'Document introuvable.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API réception BC';
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

    const lignes = Array.isArray(lignesRaw)
      ? lignesRaw.map((l) => this.normalizeLigne(l))
      : [];

    // Préremplir qté à recevoir = reste
    for (const l of lignes) {
      const reste = l.quantiteResteARecevoir ?? 0;
      l.quantiteARecevoir = reste > 0 ? reste : 0;
    }

    return {
      entete: this.normalizeEntete(enteteRaw),
      lignes,
      resteARecevoir: resteRaw ? this.normalizeReste(resteRaw) : null,
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

  private normalizeReste(row: Record<string, unknown>): BcAchatReste {
    return {
      totalQuantiteReste: Number(row['totalQuantiteReste'] ?? row['TotalQuantiteReste'] ?? 0),
      completementLivre: Boolean(row['completementLivre'] ?? row['CompletementLivre'] ?? false),
      message: (row['message'] ?? row['Message']) as string | null,
    };
  }

  private normalizeReception(raw: unknown): ReceptionResult {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const nums = (o['numerosPiecesReception'] || o['NumerosPiecesReception'] || []) as string[];
    return {
      numeroPieceBc: String(o['numeroPieceBc'] ?? o['NumeroPieceBc'] ?? ''),
      numeroPieceReception: (o['numeroPieceReception'] ?? o['NumeroPieceReception']) as
        | string
        | null,
      numerosPiecesReception: Array.isArray(nums) ? nums.map(String) : [],
      receptionPartielle: Boolean(o['receptionPartielle'] ?? o['ReceptionPartielle'] ?? false),
      message: (o['message'] ?? o['Message']) as string | null,
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

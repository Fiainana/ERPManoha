import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  CreateDemandeAchatPayload,
  DemandeAchatDetail,
  DemandeAchatListItem,
  DemandeAchatListResult,
  DemandeAchatLigne,
} from '../models/demande-achat.model';

@Injectable({ providedIn: 'root' })
export class DemandesAchatService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/b2b/demandes-achat`;

  /** Mes demandes (commercial / admin connecté). */
  listMes(opts: { statut?: string; page?: number; pageSize?: number } = {}) {
    let params = new HttpParams();
    if (opts.statut) params = params.set('statut', opts.statut);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<unknown>>(`${this.base}/mes`, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  get(id: number) {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/${id}`).pipe(
      map((res) => this.normalizeDetail(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  create(body: CreateDemandeAchatPayload) {
    return this.http.post<ApiResponse<unknown>>(this.base, body).pipe(
      map((res) => this.normalizeDetail(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  annuler(id: number) {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/annuler`, {}).pipe(
      map((res) => this.normalizeDetail(this.unwrap(res))),
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
    if (http?.status === 404) return 'Demande introuvable.';
    if (http?.status === 503) return 'Service indisponible.';
    return http?.message || 'Erreur API demandes d\'achat';
  }

  private normalizeList(raw: unknown): DemandeAchatListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 50)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalizeListItem(r)),
    };
  }

  private normalizeListItem(row: Record<string, unknown>): DemandeAchatListItem {
    const dem = (row['demandeur'] || row['Demandeur'] || {}) as Record<string, unknown>;
    return {
      id: Number(row['id'] ?? row['Id'] ?? 0),
      statut: String(row['statut'] ?? row['Statut'] ?? ''),
      statutLibelle: (row['statutLibelle'] ?? row['StatutLibelle']) as string | null,
      fournisseurCode: (row['fournisseurCode'] ?? row['FournisseurCode']) as string | null,
      depotNo: this.num(row['depotNo'] ?? row['DepotNo']),
      depotIntitule: (row['depotIntitule'] ?? row['DepotIntitule']) as string | null,
      pieceSage: (row['pieceSage'] ?? row['PieceSage']) as string | null,
      note: (row['note'] ?? row['Note']) as string | null,
      dateCreation: (row['dateCreation'] ?? row['DateCreation']) as string | null,
      dateMaj: (row['dateMaj'] ?? row['DateMaj']) as string | null,
      nbLignes: Number(row['nbLignes'] ?? row['NbLignes'] ?? 0),
      demandeurLibelle: (dem['libelle'] ?? dem['Libelle'] ?? null) as string | null,
    };
  }

  private normalizeDetail(raw: unknown): DemandeAchatDetail {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    // API : { Entete, Lignes } ou flat
    const entete = (bag['entete'] || bag['Entete'] || bag) as Record<string, unknown>;
    const lignesRaw = (bag['lignes'] || bag['Lignes'] || []) as Record<string, unknown>[];
    const dem = (entete['demandeur'] || entete['Demandeur'] || {}) as Record<string, unknown>;

    return {
      id: Number(entete['id'] ?? entete['Id'] ?? 0),
      statut: String(entete['statut'] ?? entete['Statut'] ?? ''),
      statutLibelle: (entete['statutLibelle'] ?? entete['StatutLibelle']) as string | null,
      fournisseurCode: (entete['fournisseurCode'] ?? entete['FournisseurCode']) as string | null,
      depotNo: this.num(entete['depotNo'] ?? entete['DepotNo']),
      depotIntitule: (entete['depotIntitule'] ?? entete['DepotIntitule']) as string | null,
      pieceSage: (entete['pieceSage'] ?? entete['PieceSage']) as string | null,
      note: (entete['note'] ?? entete['Note']) as string | null,
      dateCreation: (entete['dateCreation'] ?? entete['DateCreation']) as string | null,
      dateMaj: (entete['dateMaj'] ?? entete['DateMaj']) as string | null,
      demandeurLibelle: (dem['libelle'] ?? dem['Libelle'] ?? null) as string | null,
      lignes: lignesRaw.map((r) => this.normalizeLigne(r)),
    };
  }

  private normalizeLigne(row: Record<string, unknown>): DemandeAchatLigne {
    const article =
      (row['articleSage'] ?? row['ArticleSage'] ?? row['articleReference'] ?? row['ArticleReference']) as
        | string
        | null;
    return {
      id: Number(row['id'] ?? row['Id'] ?? 0),
      demandeId: Number(row['demandeId'] ?? row['DemandeId'] ?? 0),
      refFournisseur: (row['refFournisseur'] ?? row['RefFournisseur']) as string | null,
      designation: (row['designation'] ?? row['Designation']) as string | null,
      quantite: Number(row['quantite'] ?? row['Quantite'] ?? 0),
      articleSage: article,
      articleReference: article,
      qteRecue: this.num(row['qteRecue'] ?? row['QteRecue']),
      estNouvelArticle:
        row['estNouvelArticle'] === true ||
        row['EstNouvelArticle'] === true ||
        !article,
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

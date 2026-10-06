import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  CreateFournisseurPayload,
  Fournisseur,
  FournisseurListParams,
  FournisseurListResult,
  UpdateFournisseurPayload,
} from '../models/fournisseur.model';

@Injectable({ providedIn: 'root' })
export class FournisseursService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/fournisseurs`;

  list(opts: FournisseurListParams = {}) {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.ville) params = params.set('ville', opts.ville);
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));
    if (opts.inclureSommeil) params = params.set('inclureSommeil', 'true');

    return this.http.get<ApiResponse<unknown>>(this.base, { params }).pipe(
      map((res) => this.normalizeList(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  get(numero: string) {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/${encodeURIComponent(numero)}`).pipe(
      map((res) => {
        const data = this.unwrap(res) as Record<string, unknown>;
        if (!data) throw new Error('Fournisseur introuvable');
        return this.normalize(data);
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  create(body: CreateFournisseurPayload) {
    return this.http.post<ApiResponse<unknown>>(this.base, body).pipe(
      map((res) => {
        const data = this.unwrap(res) as Record<string, unknown>;
        const num = String(data?.['numero'] ?? data?.['Numero'] ?? '');
        if (!num) throw new Error('Création OK mais numéro non renvoyé');
        return num;
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  update(numero: string, body: UpdateFournisseurPayload) {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${encodeURIComponent(numero)}`, body).pipe(
      map((res) => this.unwrap(res)),
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
    if (http?.status === 404) return 'Fournisseur introuvable.';
    if (http?.status === 409) return 'Ce numéro fournisseur existe déjà.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur API fournisseurs';
  }

  private normalizeList(raw: unknown): FournisseurListResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    return {
      page: Number(bag['page'] ?? bag['Page'] ?? 1),
      pageSize: Number(bag['pageSize'] ?? bag['PageSize'] ?? (rows.length || 50)),
      total: Number(bag['total'] ?? bag['Total'] ?? rows.length),
      totalPages: Number(bag['totalPages'] ?? bag['TotalPages'] ?? (rows.length ? 1 : 0)),
      items: rows.map((r) => this.normalize(r)),
    };
  }

  private normalize(row: Record<string, unknown>): Fournisseur {
    const sommeilRaw = row['sommeil'] ?? row['Sommeil'];
    return {
      numero: String(row['numero'] ?? row['Numero'] ?? ''),
      intitule: (row['intitule'] ?? row['Intitule']) as string | null,
      adresse: (row['adresse'] ?? row['Adresse']) as string | null,
      complement: (row['complement'] ?? row['Complement']) as string | null,
      codePostal: (row['codePostal'] ?? row['CodePostal']) as string | null,
      ville: (row['ville'] ?? row['Ville']) as string | null,
      pays: (row['pays'] ?? row['Pays']) as string | null,
      telephone: (row['telephone'] ?? row['Telephone']) as string | null,
      telecopie: (row['telecopie'] ?? row['Telecopie']) as string | null,
      email: (row['email'] ?? row['Email']) as string | null,
      siret: (row['siret'] ?? row['Siret']) as string | null,
      identifiant: (row['identifiant'] ?? row['Identifiant']) as string | null,
      sommeil: sommeilRaw === true || sommeilRaw === 1 || sommeilRaw === '1',
      encours: this.num(row['encours'] ?? row['Encours']),
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

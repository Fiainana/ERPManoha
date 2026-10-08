import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  ObjectifCommercialLigne,
  ObjectifCommercialResume,
  UpsertObjectifRequest,
} from '../models/objectif-commercial.model';

@Injectable({ providedIn: 'root' })
export class ObjectifsService {
  private readonly http = inject(HttpClient);
  private readonly adminBase = `${environment.apiUrl}/admin/objectifs`;
  private readonly meBase = `${environment.apiUrl}/b2b/objectifs`;

  list(annee: number, mois: number): Observable<ObjectifCommercialResume> {
    const params = new HttpParams().set('annee', String(annee)).set('mois', String(mois));
    return this.http.get<ApiResponse<unknown>>(this.adminBase, { params }).pipe(
      map((res) => this.normalizeResume(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  upsert(body: UpsertObjectifRequest): Observable<ObjectifCommercialLigne> {
    return this.http.put<ApiResponse<unknown>>(this.adminBase, body).pipe(
      map((res) => this.normalizeLigne(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.adminBase}/${id}`).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  moi(annee?: number, mois?: number): Observable<ObjectifCommercialLigne | null> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', String(annee));
    if (mois) params = params.set('mois', String(mois));
    return this.http.get<ApiResponse<unknown>>(`${this.meBase}/moi`, { params }).pipe(
      map((res) => {
        const data = this.unwrap(res);
        if (data == null) return null;
        return this.normalizeLigne(data);
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private unwrap(res: unknown): unknown {
    if (!res || typeof res !== 'object') return res;
    const o = res as Record<string, unknown>;
    if ('data' in o) return o['data'];
    if ('Data' in o) return o['Data'];
    return res;
  }

  private normalizeResume(raw: unknown): ObjectifCommercialResume {
    const b = this.bag(raw);
    const lignes = this.arr(b['lignes'] ?? b['Lignes']).map((r) => this.normalizeLigne(r));
    return {
      annee: this.num(b['annee'] ?? b['Annee']) || new Date().getFullYear(),
      mois: this.num(b['mois'] ?? b['Mois']) || new Date().getMonth() + 1,
      objectifTotal: this.num(b['objectifTotal'] ?? b['ObjectifTotal']),
      caRealiseTotal: this.num(b['caRealiseTotal'] ?? b['CaRealiseTotal']),
      tauxMoyenPct: this.num(b['tauxMoyenPct'] ?? b['TauxMoyenPct']),
      lignes,
    };
  }

  private normalizeLigne(raw: unknown): ObjectifCommercialLigne {
    const b = this.bag(raw);
    return {
      id: this.num(b['id'] ?? b['Id']),
      sageMatricule: String(b['sageMatricule'] ?? b['SageMatricule'] ?? ''),
      nomComplet: (b['nomComplet'] ?? b['NomComplet']) as string | null,
      login: (b['login'] ?? b['Login']) as string | null,
      annee: this.num(b['annee'] ?? b['Annee']),
      mois: this.num(b['mois'] ?? b['Mois']),
      montantObjectif: this.num(b['montantObjectif'] ?? b['MontantObjectif']),
      caRealise: this.num(b['caRealise'] ?? b['CaRealise']),
      nbFactures: this.num(b['nbFactures'] ?? b['NbFactures']),
      tauxRealisationPct: this.num(b['tauxRealisationPct'] ?? b['TauxRealisationPct']),
      ecart: this.num(b['ecart'] ?? b['Ecart']),
      dateMaj: (b['dateMaj'] ?? b['DateMaj']) as string | null,
    };
  }

  private bag(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  private arr(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
  }

  private num(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.message) return body.message;
    if (http?.status === 403) return 'Accès réservé à l’administrateur.';
    return http?.message || 'Erreur objectifs';
  }
}

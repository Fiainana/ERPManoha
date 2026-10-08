import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface RapportVenteMailConfig {
  actif: boolean;
  heure: number;
  minute: number;
  destinataires: string[];
  scopesPdf: string[];
  derniereExecution?: string | null;
  dernierStatut?: string | null;
  emailSmtpConfigure: boolean;
}

@Injectable({ providedIn: 'root' })
export class RapportVenteMailService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/rapport-vente-mail`;

  getConfig(): Observable<RapportVenteMailConfig> {
    return this.http.get<ApiResponse<unknown>>(this.base).pipe(map((r) => this.mapConfig(r)));
  }

  save(body: {
    actif: boolean;
    heure: number;
    minute: number;
    destinataires: string[];
    scopesPdf: string[];
  }): Observable<RapportVenteMailConfig> {
    return this.http.put<ApiResponse<unknown>>(this.base, body).pipe(map((r) => this.mapConfig(r)));
  }

  envoyer(date?: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/envoyer`, date ? { date } : {})
      .pipe(
        map((r) => {
          if (r && typeof r === 'object' && 'success' in r && !(r as ApiResponse).success) {
            throw new Error((r as ApiResponse).message || 'Envoi échoué');
          }
          return this.unwrap(r);
        })
      );
  }

  private mapConfig(res: unknown): RapportVenteMailConfig {
    const d = this.bag(this.unwrap(res));
    return {
      actif: !!this.val(d, 'actif', 'Actif'),
      heure: Number(this.val(d, 'heure', 'Heure') ?? 17) || 17,
      minute: Number(this.val(d, 'minute', 'Minute') ?? 0) || 0,
      destinataires: this.strList(this.val(d, 'destinataires', 'Destinataires')),
      scopesPdf: this.strList(this.val(d, 'scopesPdf', 'ScopesPdf')),
      derniereExecution: (this.val(d, 'derniereExecution', 'DerniereExecution') as string) ?? null,
      dernierStatut: (this.val(d, 'dernierStatut', 'DernierStatut') as string) ?? null,
      emailSmtpConfigure: !!this.val(d, 'emailSmtpConfigure', 'EmailSmtpConfigure'),
    };
  }

  private strList(v: unknown): string[] {
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    if (typeof v === 'string')
      return v.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
    return [];
  }

  private val(o: Record<string, unknown>, a: string, b: string): unknown {
    return o[a] ?? o[b];
  }

  private unwrap(res: unknown): unknown {
    if (!res || typeof res !== 'object') return res;
    const o = res as Record<string, unknown>;
    if ('data' in o && o['data'] != null) return o['data'];
    if ('Data' in o && o['Data'] != null) return o['Data'];
    return res;
  }

  private bag(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }
}

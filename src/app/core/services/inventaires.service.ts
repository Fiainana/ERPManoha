import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  InventaireDetail,
  InventaireListResult,
  InventaireValidationResult,
} from '../models/inventaire.model';

/** Inventaire partiel : comptage dépôt → soumission → validation admin (ajustement de stock). */
@Injectable({ providedIn: 'root' })
export class InventairesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/inventaires`;

  list(opts: { statut?: string; depotNo?: number; page?: number; pageSize?: number } = {}) {
    let params = new HttpParams();
    if (opts.statut) params = params.set('statut', opts.statut);
    if (opts.depotNo) params = params.set('depotNo', String(opts.depotNo));
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));

    return this.http.get<ApiResponse<InventaireListResult>>(this.base, { params }).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  get(id: number) {
    return this.http
      .get<ApiResponse<InventaireDetail>>(`${this.base}/${id}`)
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  /** Enregistre les quantités comptées (brouillon uniquement). */
  compter(id: number, lignes: { articleReference: string; qteComptee: number | null }[]) {
    return this.http
      .put<ApiResponse<InventaireDetail>>(`${this.base}/${id}/lignes`, { lignes })
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  soumettre(id: number) {
    return this.action<InventaireDetail>(`${id}/soumettre`, {});
  }

  annuler(id: number) {
    return this.action<InventaireDetail>(`${id}/annuler`, {});
  }

  /** Admin : renvoi au dépôt pour recomptage. */
  renvoyer(id: number, note: string | null) {
    return this.action<InventaireDetail>(`${id}/renvoyer`, { note });
  }

  /** Admin : validation + ajustement du stock. Les lignes ignorées ne sont pas ajustées. */
  valider(id: number, lignesIgnorees: number[]) {
    return this.action<InventaireValidationResult>(`${id}/valider`, { lignesIgnorees });
  }

  /** Admin : génère maintenant l'inventaire hebdomadaire (idempotent). */
  genererHebdo() {
    return this.action<unknown>('generer-hebdo', {});
  }

  /**
   * Télécharge le PDF de l'inventaire. `feuille` = feuille de comptage à remplir à la main,
   * sinon rapport. L'API applique le comptage à l'aveugle (pas de théorique pour le dépôt).
   * `recomptage` (admin) : feuille limitée aux articles en écart.
   */
  telechargerPdf(id: number, feuille: boolean, recomptage = false) {
    let params = new HttpParams().set('feuille', String(feuille));
    if (recomptage) params = params.set('recomptage', 'true');
    return this.http
      .get(`${this.base}/${id}/pdf`, { params, responseType: 'blob', observe: 'response' })
      .pipe(
        map((resp) => {
          const blob = resp.body;
          if (!blob || blob.size === 0) throw new Error('PDF vide');
          const cd = resp.headers.get('content-disposition') || '';
          const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(cd);
          const nom = match
            ? decodeURIComponent(match[1].replace(/"/g, ''))
            : `${recomptage ? 'Feuille-recomptage' : feuille ? 'Feuille-comptage' : 'Inventaire'}-${id}.pdf`;
          const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = nom;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
          return nom;
        }),
        catchError((err) =>
          throwError(() =>
            new Error(
              err instanceof HttpErrorResponse && err.error instanceof Blob
                ? err.status === 404
                  ? 'Inventaire introuvable.'
                  : err.status === 400 && recomptage
                    ? 'Aucun article en écart à recompter.'
                    : err.status === 403
                      ? 'Accès refusé.'
                      : `Erreur génération PDF (${err.status})`
                : this.readError(err)
            )
          )
        )
      );
  }

  private action<T>(path: string, body: unknown) {
    return this.http.post<ApiResponse<T>>(`${this.base}/${path}`, body).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res?.success) throw new Error(res?.message || 'Erreur API inventaire');
    return res.data as T;
  }

  private readError(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err.message;
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès refusé.';
    if (http?.status === 404) return 'Inventaire introuvable.';
    if (http?.status === 503) return 'Service indisponible.';
    return http?.message || 'Erreur API inventaire';
  }
}

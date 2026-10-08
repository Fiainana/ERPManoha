import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { JourneeCommercial, PositionsLive } from '../models/suivi-gps.model';

/** Suivi GPS des commerciaux (admin) — /api/admin/presence */
@Injectable({ providedIn: 'root' })
export class SuiviGpsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/presence`;

  /** Décalage du navigateur : l'API cale « aujourd'hui » / la date sur l'heure locale. */
  private get tzOffset(): string {
    return String(new Date().getTimezoneOffset());
  }

  live(minutesEnLigne = 5) {
    const params = new HttpParams()
      .set('minutes', String(minutesEnLigne))
      .set('tzOffset', this.tzOffset);
    return this.http.get<ApiResponse<PositionsLive>>(`${this.base}/live`, { params }).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  /** date = yyyy-MM-dd (jour local). */
  journee(userId: number, date: string) {
    const params = new HttpParams()
      .set('userId', String(userId))
      .set('date', date)
      .set('tzOffset', this.tzOffset);
    return this.http
      .get<ApiResponse<JourneeCommercial>>(`${this.base}/journee`, { params })
      .pipe(
        map((res) => this.unwrap(res)),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res?.success || res.data == null) throw new Error(res?.message || 'Réponse API invalide');
    return res.data;
  }

  private readError(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err.message;
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.message) return body.message;
    if (http?.status === 403) return 'Accès réservé aux administrateurs.';
    if (http?.status === 404) return 'Utilisateur introuvable.';
    return http?.message || 'Erreur API suivi GPS';
  }
}

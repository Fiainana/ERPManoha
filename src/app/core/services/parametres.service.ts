import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { ParametresApp, ValeurParametre } from '../models/parametres.model';

/** Erreur d'enregistrement : `champs` = clé du paramètre → message. */
export class ParametresError extends Error {
  constructor(
    message: string,
    readonly champs: Record<string, string> = {}
  ) {
    super(message);
  }
}

/** Paramètres métier (admin) — /api/admin/parametres */
@Injectable({ providedIn: 'root' })
export class ParametresService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/parametres`;

  lister() {
    return this.http.get<ApiResponse<ParametresApp>>(this.base).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => this.toError(err)))
    );
  }

  /** Seules les clés envoyées sont modifiées ; null = revenir à la valeur par défaut. */
  enregistrer(valeurs: Record<string, ValeurParametre>) {
    return this.http.put<ApiResponse<ParametresApp>>(this.base, { valeurs }).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => this.toError(err)))
    );
  }

  testerEmail(destinataire: string) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/email/test`, { destinataire })
      .pipe(
        map((res) => res?.message || 'E-mail de test envoyé'),
        catchError((err) => throwError(() => this.toError(err)))
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res?.success || res.data == null) throw new Error(res?.message || 'Réponse API invalide');
    return res.data;
  }

  private toError(err: unknown): Error {
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err;
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse<unknown> | undefined;
    if (http?.status === 400 && body?.data && typeof body.data === 'object') {
      return new ParametresError(body.message || 'Paramètres invalides', body.data as Record<string, string>);
    }
    if (body?.message) return new Error(body.detail ? `${body.message} ${body.detail}` : body.message);
    if (http?.status === 403) return new Error('Accès réservé aux administrateurs.');
    return new Error(http?.message || 'Erreur API paramètres');
  }
}

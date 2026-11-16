import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { CloturerRequest, ClotureListe, JourCaisse, VersementRequest } from '../models/caisse.model';

/** Clôture de caisse journalière : rôles Caisse et Admin (réouverture : Admin). */
@Injectable({ providedIn: 'root' })
export class CaisseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/caisse/clotures`;

  jour(jour: string) {
    return this.wrap(this.http.get<ApiResponse<JourCaisse>>(`${this.base}/${jour}`));
  }

  liste(debut: string, fin: string) {
    const params = new HttpParams().set('debut', debut).set('fin', fin);
    return this.wrap(this.http.get<ApiResponse<ClotureListe>>(this.base, { params }));
  }

  cloturer(req: CloturerRequest) {
    return this.wrap(this.http.post<ApiResponse<JourCaisse>>(this.base, req));
  }

  verser(jour: string, req: VersementRequest) {
    return this.wrap(this.http.post<ApiResponse<JourCaisse>>(`${this.base}/${jour}/versement`, req));
  }

  rouvrir(jour: string, motif: string) {
    return this.wrap(this.http.post<ApiResponse<JourCaisse>>(`${this.base}/${jour}/rouvrir`, { motif }));
  }

  /** PDF de la clôture, ouvert dans un nouvel onglet. */
  pdf(jour: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/${jour}/pdf`, { responseType: 'blob' })
      .pipe(catchError((err) => throwError(() => new Error(this.lireErreur(err)))));
  }

  private wrap<T>(obs: Observable<ApiResponse<T>>) {
    return obs.pipe(
      map((res) => {
        if (!res?.success) throw new Error(res?.message || 'Erreur API caisse');
        return { data: res.data as T, message: res.message ?? null };
      }),
      catchError((err) => throwError(() => new Error(this.lireErreur(err))))
    );
  }

  private lireErreur(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err.message;
    const http = err as HttpErrorResponse;
    if (http?.status === 0) return 'Serveur injoignable : vérifiez la connexion puis réessayez.';
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (http?.status === 403) return 'Action réservée à l’administrateur.';
    if (http?.status === 404) return 'Clôture introuvable.';
    return http?.message || 'Erreur API caisse';
  }
}

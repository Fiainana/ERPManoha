import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  ImmoCategorie,
  ImmoCategorieRequest,
  ImmoControles,
  ImmoDotationResultat,
  ImmoEcriture,
  ImmoEtatAnnuel,
  ImmoExportResultat,
  ImmoFamilleSage,
  ImmoFiche,
  ImmoFicheRequest,
  ImmoSortieResultat,
  ImmoSyncResultat,
  ImmoValiderRequest,
} from '../models/immo.model';

/** Immobilisations : fiches, synchro des achats Sage, dotations, sorties et écritures vers Sage. */
@Injectable({ providedIn: 'root' })
export class ImmoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/immo`;

  // —— Paramétrage ——
  categories() {
    return this.get<ImmoCategorie[]>('categories');
  }

  saveCategorie(id: number, body: ImmoCategorieRequest) {
    return this.call(this.http.put<ApiResponse<ImmoCategorie>>(`${this.base}/categories/${id}`, body));
  }

  famillesSage() {
    return this.get<ImmoFamilleSage[]>('familles-sage');
  }

  sites() {
    return this.get<string[]>('sites');
  }

  // —— Fiches ——
  fiches(statut?: string) {
    return this.get<ImmoFiche[]>('fiches', statut ? new HttpParams().set('statut', statut) : undefined);
  }

  fiche(id: number) {
    return this.get<ImmoFiche>(`fiches/${id}`);
  }

  creer(body: ImmoFicheRequest) {
    return this.post<ImmoFiche>('fiches', body);
  }

  modifier(id: number, body: ImmoFicheRequest) {
    return this.call(this.http.put<ApiResponse<ImmoFiche>>(`${this.base}/fiches/${id}`, body));
  }

  valider(id: number, body: ImmoValiderRequest) {
    return this.post<ImmoFiche>(`fiches/${id}/valider`, body);
  }

  miseEnService(id: number, dateMiseEnService: string, accepterDepassementDgi: boolean) {
    return this.post<ImmoFiche>(`fiches/${id}/mise-en-service`, { dateMiseEnService, accepterDepassementDgi });
  }

  rejeter(id: number, motif: string) {
    return this.post<ImmoFiche>(`fiches/${id}/rejeter`, { motif });
  }

  ceder(
    id: number,
    body: { dateCession: string; prixCession: number; passerPrixCession: boolean; pieceSage?: string | null }
  ) {
    return this.post<ImmoSortieResultat>(`fiches/${id}/cession`, body);
  }

  rebut(id: number, dateRebut: string, motif: string) {
    return this.post<ImmoSortieResultat>(`fiches/${id}/rebut`, { dateRebut, motif });
  }

  // —— Synchro des achats Sage ——
  syncAchats(opts: { apercu: boolean; depuis?: string }) {
    let params = new HttpParams().set('apercu', String(opts.apercu));
    if (opts.depuis) params = params.set('depuis', opts.depuis);
    return this.call(this.http.post<ApiResponse<ImmoSyncResultat>>(`${this.base}/sync-achats`, null, { params }));
  }

  // —— Dotations ——
  dotations(annee: number, mois: number | null, apercu: boolean) {
    let params = new HttpParams().set('annee', String(annee)).set('apercu', String(apercu));
    if (mois) params = params.set('mois', String(mois));
    return this.call(
      this.http.post<ApiResponse<ImmoDotationResultat>>(`${this.base}/dotations/generer`, null, { params })
    );
  }

  // —— Écritures Sage ——
  ecritures(statut?: string) {
    return this.get<ImmoEcriture[]>('ecritures', statut ? new HttpParams().set('statut', statut) : undefined);
  }

  exporter(id?: number) {
    const params = id ? new HttpParams().set('id', String(id)) : undefined;
    return this.call(
      this.http.post<ApiResponse<ImmoExportResultat>>(`${this.base}/ecritures/exporter`, null, { params })
    );
  }

  // —— États et contrôles ——
  etatAnnuel(annee: number) {
    return this.get<ImmoEtatAnnuel>('etat-annuel', new HttpParams().set('annee', String(annee)));
  }

  controles(annee: number) {
    return this.get<ImmoControles>('controles', new HttpParams().set('annee', String(annee)));
  }

  /** Télécharge l'état annuel en PDF ou en CSV (ouvert par Excel). */
  telechargerEtat(annee: number, format: 'pdf' | 'csv') {
    const params = new HttpParams().set('annee', String(annee)).set('format', format);
    return this.http.get(`${this.base}/etat-annuel`, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((resp) => {
        const blob = resp.body;
        if (!blob || blob.size === 0) throw new Error('Fichier vide');
        const nom = `immobilisations-${annee}.${format}`;
        const url = URL.createObjectURL(
          new Blob([blob], { type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8' })
        );
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
          new Error(err instanceof HttpErrorResponse ? `Export impossible (${err.status})` : (err as Error).message)
        )
      )
    );
  }

  // —— Internes ——
  private get<T>(path: string, params?: HttpParams) {
    return this.call(this.http.get<ApiResponse<T>>(`${this.base}/${path}`, { params }));
  }

  private post<T>(path: string, body: unknown) {
    return this.call(this.http.post<ApiResponse<T>>(`${this.base}/${path}`, body));
  }

  private call<T>(req: Observable<ApiResponse<T>>) {
    return req.pipe(
      map((res) => {
        if (!res.success) throw new Error(res.message || res.detail || 'Erreur');
        return res.data as T;
      }),
      catchError((err: HttpErrorResponse | Error) => throwError(() => new Error(this.readError(err))))
    );
  }

  private readError(err: HttpErrorResponse | Error): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse | null;
      return body?.message || body?.detail || body?.errors?.[0] || err.message;
    }
    return err.message;
  }
}

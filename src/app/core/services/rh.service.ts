import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  RhAbsence,
  RhAbsenceCreation,
  RhAbsenceDetail,
  RhAbsenceRequest,
  RhAjustement,
  RhContrat,
  RhDepartement,
  RhEmployeDetail,
  RhEmployeListItem,
  RhEmployeRequest,
  RhHoraire,
  RhJourFerie,
  RhJoursOffResult,
  RhJustifierRequest,
  RhPage,
  RhPersonnePointeuse,
  RhPlanifierRotationRequest,
  RhPlanifierRotationResult,
  RhPlanning,
  RhPointage,
  RhPoste,
  RhPresenceDuJour,
  RhRapportPresence,
  RhResponsablePossible,
  RhSoldeConges,
  RhStatutPointeuse,
  RhTableauBord,
} from '../models/rh.model';

type Query = Record<string, string | number | boolean | null | undefined>;

/** Back-office RH (rôles HR et Admin) : /api/rh/*. */
@Injectable({ providedIn: 'root' })
export class RhService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/rh`;

  // —— Tableau de bord ——

  tableauDeBord(joursAlerte = 30) {
    return this.get<RhTableauBord>('tableau-de-bord', { joursAlerte });
  }

  // —— Employés ——

  employes(q: { search?: string; statut?: string; departementId?: number | null; page?: number; pageSize?: number }) {
    return this.get<RhPage<RhEmployeListItem>>('employes', q);
  }

  employe(id: number) {
    return this.get<RhEmployeDetail>(`employes/${id}`);
  }

  creerEmploye(req: RhEmployeRequest) {
    return this.send<{ id: number } & Record<string, unknown>>('POST', 'employes', req);
  }

  modifierEmploye(id: number, req: RhEmployeRequest) {
    return this.send<unknown>('PUT', `employes/${id}`, req);
  }

  sortieEmploye(id: number, dateSortie: string, motif: string | null) {
    return this.send<unknown>('POST', `employes/${id}/sortie`, { dateSortie, motif });
  }

  statutEmploye(id: number, statut: 'Actif' | 'Suspendu') {
    return this.send<unknown>('PUT', `employes/${id}/statut`, { statut });
  }

  soldeConges(id: number, date?: string) {
    return this.get<RhSoldeConges>(`employes/${id}/solde-conges`, { date });
  }

  ajustements(id: number) {
    return this.get<{ ajustements: RhAjustement[]; solde: RhSoldeConges }>(`employes/${id}/ajustements-conges`);
  }

  ajouterAjustement(id: number, jours: number, motif: string, dateEffet: string | null) {
    return this.send<{ ajustements: RhAjustement[]; solde: RhSoldeConges }>(
      'POST',
      `employes/${id}/ajustements-conges`,
      { jours, motif, dateEffet }
    );
  }

  supprimerAjustement(ajustementId: number) {
    return this.send<unknown>('DELETE', `employes/ajustements-conges/${ajustementId}`);
  }

  contrats(id: number) {
    return this.get<RhContrat[]>(`employes/${id}/contrats`);
  }

  enregistrerContrat(employeId: number, contratId: number | null, req: Record<string, unknown>) {
    return contratId
      ? this.send<unknown>('PUT', `employes/contrats/${contratId}`, req)
      : this.send<unknown>('POST', `employes/${employeId}/contrats`, req);
  }

  supprimerContrat(contratId: number) {
    return this.send<unknown>('DELETE', `employes/contrats/${contratId}`);
  }

  definirPin(id: number, pin: string) {
    return this.send<unknown>('PUT', `employes/${id}/pin`, { pin });
  }

  supprimerPin(id: number) {
    return this.send<unknown>('DELETE', `employes/${id}/pin`);
  }

  importerPointeuse(pointeuseNos?: string[]) {
    return this.send<unknown>('POST', 'employes/importer-pointeuse', { pointeuseNos: pointeuseNos ?? null });
  }

  // —— Absences ——

  absences(q: {
    employeId?: number | null;
    statut?: string;
    type?: string;
    debut?: string;
    fin?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.get<RhPage<RhAbsence>>('absences', q);
  }

  absence(id: number) {
    return this.get<RhAbsenceDetail>(`absences/${id}`);
  }

  creerAbsence(req: RhAbsenceRequest) {
    return this.send<RhAbsenceCreation>('POST', 'absences', req);
  }

  traiterAbsence(id: number, action: 'valider' | 'refuser' | 'annuler', commentaire: string | null) {
    return this.send<unknown>('POST', `absences/${id}/${action}`, { commentaire });
  }

  ajouterDocument(absenceId: number, fichier: File) {
    const form = new FormData();
    form.append('fichier', fichier);
    return this.send<unknown>('POST', `absences/${absenceId}/documents`, form);
  }

  supprimerDocument(documentId: number) {
    return this.send<unknown>('DELETE', `absences/documents/${documentId}`);
  }

  telechargerDocument(documentId: number): Observable<Blob> {
    return this.http
      .get(`${this.base}/absences/documents/${documentId}`, { responseType: 'blob' })
      .pipe(catchError((err) => throwError(() => new Error(this.readError(err)))));
  }

  // —— Référentiels ——

  departements() {
    return this.get<RhDepartement[]>('departements');
  }

  enregistrerDepartement(id: number | null, req: Record<string, unknown>) {
    return id ? this.send<unknown>('PUT', `departements/${id}`, req) : this.send<unknown>('POST', 'departements', req);
  }

  responsablesPossibles() {
    return this.get<RhResponsablePossible[]>('responsables-possibles');
  }

  postes() {
    return this.get<RhPoste[]>('postes');
  }

  enregistrerPoste(id: number | null, req: Record<string, unknown>) {
    return id ? this.send<unknown>('PUT', `postes/${id}`, req) : this.send<unknown>('POST', 'postes', req);
  }

  horaires() {
    return this.get<RhHoraire[]>('horaires');
  }

  enregistrerHoraire(id: number | null, req: Record<string, unknown>) {
    return id ? this.send<unknown>('PUT', `horaires/${id}`, req) : this.send<unknown>('POST', 'horaires', req);
  }

  joursFeries(annee: number) {
    return this.get<RhJourFerie[]>('jours-feries', { annee });
  }

  enregistrerJourFerie(date: string, libelle: string) {
    return this.send<unknown>('POST', 'jours-feries', { date, libelle });
  }

  supprimerJourFerie(date: string) {
    return this.send<unknown>('DELETE', `jours-feries/${date}`);
  }

  initialiserJoursFeries(annee: number) {
    return this.send<unknown>('POST', `jours-feries/initialiser?annee=${annee}`, {});
  }

  // —— Planning ——

  planning(q: { debut?: string; fin?: string; employeId?: number | null; departementId?: number | null }) {
    return this.get<RhPlanning>('planning', q);
  }

  ajouterJoursOff(employeId: number, dates: string[], motif: string | null) {
    return this.send<RhJoursOffResult>('POST', 'jours-off', { employeId, dates, motif });
  }

  supprimerJourOff(employeId: number, date: string) {
    return this.send<unknown>('DELETE', `jours-off/${employeId}/${date}`);
  }

  planifierRotation(req: RhPlanifierRotationRequest) {
    return this.send<RhPlanifierRotationResult>('POST', 'jours-off/planifier-rotation', req);
  }

  // —— Présence ——

  presenceDuJour(departementId?: number | null) {
    return this.get<RhPresenceDuJour>('presence/aujourdhui', { departementId });
  }

  rapportPresence(q: { debut?: string; fin?: string; employeId?: number | null; departementId?: number | null }) {
    return this.get<RhRapportPresence>('presence', q);
  }

  justifier(req: RhJustifierRequest) {
    return this.send<RhAbsenceCreation>('POST', 'presence/justifier', req);
  }

  // —— Pointeuse ——

  pointages(q: {
    dateDebut?: string;
    dateFin?: string;
    employeNo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.get<RhPage<RhPointage>>('pointage', q);
  }

  pointageManuel(employeId: number, datePointage: string, motif: string) {
    return this.send<unknown>('POST', 'pointage/manuel', { employeId, datePointage, motif });
  }

  ignorerPointage(id: number, motif: string) {
    return this.send<unknown>('POST', `pointage/${id}/ignorer`, { motif });
  }

  retablirPointage(id: number) {
    return this.send<unknown>('POST', `pointage/${id}/retablir`, {});
  }

  personnesPointeuse() {
    return this.get<RhPersonnePointeuse[]>('pointage/employes');
  }

  statutPointeuse() {
    return this.get<RhStatutPointeuse>('pointage/statut');
  }

  synchroniser(depuis?: string | null) {
    return this.send<unknown>('POST', 'pointage/synchroniser', { depuis: depuis || null });
  }

  // —— Plomberie ——

  private get<T>(path: string, query?: Query) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ApiResponse<T>>(`${this.base}/${path}`, { params }).pipe(
      map((res) => this.unwrap(res)),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  /** Renvoie aussi le message de succès de l'API (affiché en toast). */
  private send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    return this.http
      .request<ApiResponse<T>>(method, `${this.base}/${path}`, { body: body ?? undefined })
      .pipe(
        map((res) => ({ data: this.unwrap(res), message: res?.message ?? null })),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res?.success) throw new Error(res?.message || 'Erreur API RH');
    return res.data as T;
  }

  private readError(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err.message;
    const http = err as HttpErrorResponse;
    if (http?.status === 0) return 'Serveur injoignable : vérifiez la connexion puis réessayez.';
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès refusé.';
    if (http?.status === 404) return 'Élément introuvable.';
    if (http?.status === 502) return 'Pointeuse injoignable ou accès refusé.';
    if (http?.status === 504) return 'La pointeuse ne répond pas (délai dépassé).';
    return http?.message || 'Erreur API RH';
  }
}

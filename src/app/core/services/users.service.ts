import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  CreateUserAppRequest,
  UpdateUserAppRequest,
  UserApp,
} from '../models/user-app.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  /** CRUD admin — GET|POST /api/admin/users */
  private readonly base = `${environment.apiUrl}/admin/users`;

  list() {
    return this.http.get<ApiResponse<UserApp[] | Record<string, unknown>>>(this.base).pipe(
      map((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Impossible de charger les utilisateurs');
        }
        return this.normalizeList(res.data).map((u) => this.normalizeUser(u));
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  create(body: CreateUserAppRequest) {
    return this.http.post<ApiResponse<unknown>>(this.base, this.cleanCreate(body)).pipe(
      map((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Création utilisateur impossible');
        }
        return this.normalizeUser(res.data);
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  update(id: number, body: UpdateUserAppRequest) {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${id}`, body).pipe(
      map((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Mise à jour impossible');
        }
        return this.normalizeUser(res.data);
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  setActif(id: number, actif: boolean) {
    return this.http.patch<ApiResponse<unknown>>(`${this.base}/${id}/actif`, { actif }).pipe(
      map((res) => {
        if (!res.success) {
          throw new Error(res.message || 'Changement de statut impossible');
        }
        return this.normalizeUser(res.data);
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private cleanCreate(body: CreateUserAppRequest): CreateUserAppRequest {
    const out: CreateUserAppRequest = {
      login: body.login.trim(),
      nom: body.nom.trim(),
      vendeur: !!body.vendeur,
      acheteur: !!body.acheteur,
      caissier: !!body.caissier,
      chargeRecouvrement: !!body.chargeRecouvrement,
      receptionnaire: !!body.receptionnaire,
      isAdmin: !!body.isAdmin,
      actif: body.actif !== false,
      roles: body.roles?.filter(Boolean),
    };
    if (body.password?.trim()) out.password = body.password;
    if (body.prenom?.trim()) out.prenom = body.prenom.trim();
    if (body.matricule?.trim()) out.matricule = body.matricule.trim();
    if (body.fonction?.trim()) out.fonction = body.fonction.trim();
    if (body.service?.trim()) out.service = body.service.trim();
    if (body.rfidCode?.trim()) out.rfidCode = body.rfidCode.trim();
    if (body.pin?.trim()) out.pin = body.pin.trim();
    return out;
  }

  private normalizeList(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === 'object') {
      const raw = data as Record<string, unknown>;
      const items = raw['items'] || raw['Items'] || raw['users'] || raw['Users'];
      if (Array.isArray(items)) return items as Record<string, unknown>[];
    }
    return [];
  }

  private normalizeUser(raw: unknown): UserApp {
    if (!raw || typeof raw !== 'object') return {};
    const row = raw as Record<string, unknown>;
    const rolesRaw = row['roles'] ?? row['Roles'];
    let roles: string[] | string | null = null;
    if (Array.isArray(rolesRaw)) {
      roles = rolesRaw.map(String);
    } else if (typeof rolesRaw === 'string') {
      roles = rolesRaw;
    }

    return {
      id: Number(row['id'] ?? row['Id'] ?? 0) || undefined,
      login: (row['login'] ?? row['Login']) as string | null,
      nom: (row['nom'] ?? row['Nom']) as string | null,
      prenom: (row['prenom'] ?? row['Prenom']) as string | null,
      sageMatricule: (row['sageMatricule'] ??
        row['SageMatricule'] ??
        row['matricule'] ??
        row['Matricule']) as string | null,
      matricule: (row['matricule'] ?? row['Matricule']) as string | null,
      fonction: (row['fonction'] ?? row['Fonction']) as string | null,
      service: (row['service'] ?? row['Service']) as string | null,
      isAdmin: Boolean(row['isAdmin'] ?? row['IsAdmin']),
      roles,
      actif: row['actif'] ?? row['Actif'] ?? true,
      hasPassword: Boolean(row['hasPassword'] ?? row['HasPassword']),
      hasRfid: Boolean(row['hasRfid'] ?? row['HasRfid']),
      hasPin: Boolean(row['hasPin'] ?? row['HasPin']),
      derniereConnexion: (row['derniereConnexion'] ?? row['DerniereConnexion']) as string | null,
      vendeur: Boolean(row['vendeur'] ?? row['Vendeur']),
      acheteur: Boolean(row['acheteur'] ?? row['Acheteur']),
      caissier: Boolean(row['caissier'] ?? row['Caissier']),
      chargeRecouvrement: Boolean(row['chargeRecouvrement'] ?? row['ChargeRecouvrement']),
      receptionnaire: Boolean(row['receptionnaire'] ?? row['Receptionnaire']),
    };
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès réservé à l’administrateur.';
    if (http?.status === 409) return body?.message || 'Ce login existe déjà.';
    if (http?.status >= 500) {
      return body?.message || 'Erreur serveur utilisateurs.';
    }
    return http?.message || 'Erreur utilisateurs';
  }
}

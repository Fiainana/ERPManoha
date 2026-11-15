import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  AchatDetail,
  AchatEtatReglement,
  AchatListe,
  AchatListeParams,
  CommanderPayload,
  CommanderResultat,
  CreerArticlePayload,
  CreerDemandePayload,
  FacturerPayload,
  FacturerResultat,
  ReferentielArticle,
  ReglerPayload,
  TypeAchat,
} from '../models/achats.model';

/** Documents d'achat Sage : lecture, création de demande, statut, commande, facturation et règlement. */
@Injectable({ providedIn: 'root' })
export class AchatsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/achats`;
  private referentiel$?: Observable<ReferentielArticle>;

  /** Message à afficher sur l'écran suivant (ex. « DEA000021 → bon de commande BCA000019 »). */
  readonly flash = signal<string | null>(null);

  lister(type: TypeAchat, p: AchatListeParams = {}): Observable<AchatListe> {
    let params = new HttpParams();
    if (p.search) params = params.set('search', p.search);
    if (p.fournisseur) params = params.set('fournisseur', p.fournisseur);
    if (p.dateDebut) params = params.set('dateDebut', p.dateDebut);
    if (p.dateFin) params = params.set('dateFin', p.dateFin);
    if (p.nonReglees) params = params.set('nonReglees', 'true');
    params = params.set('page', String(p.page ?? 1)).set('pageSize', String(p.pageSize ?? 40));
    return this.lire(this.http.get<ApiResponse<AchatListe>>(`${this.base}/${type}`, { params }));
  }

  detail(type: TypeAchat, piece: string): Observable<AchatDetail> {
    return this.lire(this.http.get<ApiResponse<AchatDetail>>(this.url(type, piece)));
  }

  creerDemande(body: CreerDemandePayload): Observable<{ numeroPiece: string; message: string }> {
    return this.lire(this.http.post<ApiResponse<{ numeroPiece: string; message: string }>>(`${this.base}/demandes`, body));
  }

  changerStatut(type: TypeAchat, piece: string, statut: number): Observable<{ message: string; document: AchatDetail }> {
    return this.lire(
      this.http.post<ApiResponse<{ message: string; document: AchatDetail }>>(`${this.url(type, piece)}/statut`, { statut })
    );
  }

  commander(type: TypeAchat, piece: string, body: CommanderPayload): Observable<CommanderResultat> {
    return this.lire(this.http.post<ApiResponse<CommanderResultat>>(`${this.url(type, piece)}/commander`, body));
  }

  /** Un BL : route simple. Plusieurs BL d'un même fournisseur : une seule facture. */
  facturer(pieces: string[], body: FacturerPayload): Observable<FacturerResultat> {
    const requete =
      pieces.length === 1
        ? this.http.post<ApiResponse<FacturerResultat>>(`${this.url('receptions', pieces[0])}/facturer`, body)
        : this.http.post<ApiResponse<FacturerResultat>>(`${this.base}/receptions/facturer`, { ...body, pieces });
    return this.lire(requete);
  }

  reglements(piece: string): Observable<AchatEtatReglement> {
    return this.lire(this.http.get<ApiResponse<AchatEtatReglement>>(`${this.url('factures', piece)}/reglements`));
  }

  regler(piece: string, body: ReglerPayload): Observable<{ message: string; etat: AchatEtatReglement }> {
    return this.lire(
      this.http.post<ApiResponse<{ message: string; etat: AchatEtatReglement }>>(`${this.url('factures', piece)}/regler`, body)
    );
  }

  /** Familles, unités et dépôts Sage (chargés une fois). */
  referentielArticle(): Observable<ReferentielArticle> {
    this.referentiel$ ??= this.lire(
      this.http.get<ApiResponse<ReferentielArticle>>(`${environment.apiUrl}/admin/articles/referentiel-creation`)
    ).pipe(shareReplay(1));
    return this.referentiel$;
  }

  creerArticle(body: CreerArticlePayload): Observable<{ reference: string; designation: string; prixAchat: number }> {
    return this.lire(
      this.http.post<ApiResponse<{ reference: string; designation: string; prixAchat: number }>>(
        `${environment.apiUrl}/admin/articles`,
        body
      )
    );
  }

  private url(type: TypeAchat, piece: string): string {
    return `${this.base}/${type}/${encodeURIComponent(piece)}`;
  }

  private lire<T>(requete: Observable<ApiResponse<T>>): Observable<T> {
    return requete.pipe(
      map((res) => {
        if (!res.success) throw new Error(res.message || 'Opération refusée');
        return res.data as T;
      }),
      catchError((err: HttpErrorResponse | Error) => throwError(() => new Error(lireErreur(err))))
    );
  }
}

function lireErreur(err: HttpErrorResponse | Error): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'API injoignable. Vérifiez la connexion.';
    const body = err.error as ApiResponse | null;
    if (body?.code === 'SAGE_POOL_BUSY') return 'Sage est occupé : réessayez dans quelques secondes.';
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (err.status === 403) return 'Accès réservé aux administrateurs.';
    if (err.status === 404) return 'Document introuvable.';
    return body?.detail || err.message;
  }
  return err.message;
}

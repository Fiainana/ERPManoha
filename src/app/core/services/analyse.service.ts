import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  AnalyseMagasin,
  AnalyseListeParams,
  AnalyseListeSimple,
  AnalysePage,
  AnalyseSynthese,
  ArticleAnalyse,
  ArticleDetailAnalyse,
  ArticlesExtra,
  ArticlesResume,
  ClientAnalyse,
  ClientDetailAnalyse,
  ClientsResume,
  CommercialAnalyse,
  FamilleAnalyse,
  FournisseurAnalyse,
  FournisseurDetailAnalyse,
  FournisseursResume,
  Granularite,
} from '../models/analyse.model';

export type PresetPeriode =
  | 'mois'
  | 'mois-precedent'
  | 'trimestre'
  | 'annee'
  | '12-mois'
  | 'annee-precedente'
  | 'perso';

export const PRESETS: { id: PresetPeriode; libelle: string }[] = [
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'mois-precedent', libelle: 'Mois dernier' },
  { id: 'trimestre', libelle: 'Ce trimestre' },
  { id: 'annee', libelle: 'Cette année' },
  { id: '12-mois', libelle: '12 derniers mois' },
  { id: 'annee-precedente', libelle: 'Année dernière' },
];

const CLE_STOCKAGE = 'erp.analyse.periode';

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Bornes d'un raccourci de période (jours locaux). */
export function bornesPreset(preset: PresetPeriode, aujourdhui = new Date()): { debut: string; fin: string } {
  const a = aujourdhui.getFullYear();
  const m = aujourdhui.getMonth();
  switch (preset) {
    case 'mois':
      return { debut: iso(new Date(a, m, 1)), fin: iso(aujourdhui) };
    case 'mois-precedent':
      return { debut: iso(new Date(a, m - 1, 1)), fin: iso(new Date(a, m, 0)) };
    case 'trimestre':
      return { debut: iso(new Date(a, m - (m % 3), 1)), fin: iso(aujourdhui) };
    case '12-mois':
      return { debut: iso(new Date(a, m - 11, 1)), fin: iso(aujourdhui) };
    case 'annee-precedente':
      return { debut: iso(new Date(a - 1, 0, 1)), fin: iso(new Date(a - 1, 11, 31)) };
    default:
      return { debut: iso(new Date(a, 0, 1)), fin: iso(aujourdhui) };
  }
}

/**
 * Période partagée par tous les écrans Analyse (gardée pendant la session de navigation).
 * Chaque page relit les données quand `version` change.
 */
@Injectable({ providedIn: 'root' })
export class AnalysePeriodeService {
  readonly preset = signal<PresetPeriode>('annee');
  readonly debut = signal('');
  readonly fin = signal('');
  /** Découpage des courbes d'évolution (synthèse et fiches). */
  readonly granularite = signal<Granularite>('auto');
  /** Change avec les dates : listes. */
  readonly version = computed(() => `${this.debut()}|${this.fin()}`);
  /** Change avec les dates ou le découpage : écrans qui ont une courbe. */
  readonly versionSerie = computed(() => `${this.version()}|${this.granularite()}`);

  constructor() {
    let lu: { preset: PresetPeriode; debut: string; fin: string; granularite?: Granularite } | null = null;
    try {
      lu = JSON.parse(sessionStorage.getItem(CLE_STOCKAGE) || 'null');
    } catch {
      lu = null;
    }
    if (lu?.granularite) this.granularite.set(lu.granularite);
    if (lu && lu.preset !== 'perso') this.choisir(lu.preset);
    else if (lu) this.personnaliser(lu.debut, lu.fin);
    else this.choisir('annee');
  }

  choisir(preset: PresetPeriode): void {
    if (preset === 'perso') {
      this.preset.set('perso');
      this.sauver();
      return;
    }
    const b = bornesPreset(preset);
    this.preset.set(preset);
    this.debut.set(b.debut);
    this.fin.set(b.fin);
    this.sauver();
  }

  personnaliser(debut: string, fin: string): void {
    if (!debut || !fin) return;
    this.preset.set('perso');
    this.debut.set(debut <= fin ? debut : fin);
    this.fin.set(debut <= fin ? fin : debut);
    this.sauver();
  }

  decouper(g: Granularite): void {
    this.granularite.set(g);
    this.sauver();
  }

  params(avecSerie = false): HttpParams {
    const p = new HttpParams().set('debut', this.debut()).set('fin', this.fin());
    return avecSerie ? p.set('granularite', this.granularite()) : p;
  }

  private sauver(): void {
    try {
      sessionStorage.setItem(
        CLE_STOCKAGE,
        JSON.stringify({
          preset: this.preset(),
          debut: this.debut(),
          fin: this.fin(),
          granularite: this.granularite(),
        })
      );
    } catch {
      /* stockage indisponible : la période reste en mémoire */
    }
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyseService {
  private readonly http = inject(HttpClient);
  private readonly periode = inject(AnalysePeriodeService);
  private readonly base = `${environment.apiUrl}/admin/analyse`;

  synthese() {
    return this.get<AnalyseSynthese>('synthese', undefined, true);
  }

  articles(p: AnalyseListeParams) {
    return this.get<AnalysePage<ArticleAnalyse, ArticlesResume, ArticlesExtra>>('articles', p);
  }

  article(reference: string) {
    return this.get<ArticleDetailAnalyse>(`articles/${encodeURIComponent(reference)}`, undefined, true);
  }

  familles() {
    return this.get<AnalyseListeSimple<FamilleAnalyse>>('familles');
  }

  clients(p: AnalyseListeParams) {
    return this.get<AnalysePage<ClientAnalyse, ClientsResume>>('clients', p);
  }

  client(numero: string) {
    return this.get<ClientDetailAnalyse>(`clients/${encodeURIComponent(numero)}`, undefined, true);
  }

  fournisseurs(p: AnalyseListeParams) {
    return this.get<AnalysePage<FournisseurAnalyse, FournisseursResume>>('fournisseurs', p);
  }

  fournisseur(numero: string) {
    return this.get<FournisseurDetailAnalyse>(`fournisseurs/${encodeURIComponent(numero)}`, undefined, true);
  }

  magasin() {
    return this.get<AnalyseMagasin>('magasin');
  }

  commerciaux() {
    return this.get<AnalyseListeSimple<CommercialAnalyse>>('commerciaux');
  }

  private get<T>(path: string, liste?: AnalyseListeParams, avecSerie = false): Observable<T> {
    let params = this.periode.params(avecSerie);
    if (liste) {
      for (const [k, v] of Object.entries(liste)) {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      }
    }
    return this.http.get<ApiResponse<T>>(`${this.base}/${path}`, { params }).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.message || res.detail || 'Erreur');
        return res.data as T;
      }),
      catchError((err: HttpErrorResponse | Error) => throwError(() => new Error(lireErreur(err))))
    );
  }
}

function lireErreur(err: HttpErrorResponse | Error): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiResponse | null;
    if (err.status === 0) return 'API injoignable';
    return body?.message || body?.detail || body?.errors?.[0] || err.message;
  }
  return err.message;
}

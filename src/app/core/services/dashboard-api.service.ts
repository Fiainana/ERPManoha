import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  DashboardKpiBundle,
  DashboardKpiCard,
  DashboardKpiListItem,
} from '../models/dashboard-kpi.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  loadForRoles(roles: string[]): Observable<DashboardKpiBundle> {
    if (roles.includes('Admin')) {
      return this.getAdmin().pipe(catchError(() => of(this.empty('admin'))));
    }
    if (roles.includes('Commercial')) {
      return this.getCommercial(true).pipe(catchError(() => of(this.empty('commercial'))));
    }
    if (roles.includes('Recouvrement')) {
      return this.getCommercial(false).pipe(
        map((b) => ({ ...b, mode: 'recouvrement' as const })),
        catchError(() => of(this.empty('recouvrement')))
      );
    }
    if (roles.includes('Depot')) {
      return this.getDepot().pipe(catchError(() => of(this.empty('depot'))));
    }
    return of(this.empty('none'));
  }

  private getAdmin(): Observable<DashboardKpiBundle> {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/admin/dashboard`).pipe(
      map((res) => this.mapAdmin(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private getCommercial(mes: boolean): Observable<DashboardKpiBundle> {
    const params = new HttpParams().set('mes', String(mes));
    return this.http.get<ApiResponse<unknown>>(`${this.base}/b2b/dashboard`, { params }).pipe(
      map((res) => this.mapCommercial(this.unwrap(res), mes)),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private getDepot(): Observable<DashboardKpiBundle> {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/depot/dashboard`).pipe(
      map((res) => this.mapDepot(this.unwrap(res))),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private mapAdmin(raw: unknown): DashboardKpiBundle {
    const b = this.bag(raw);
    const auj = this.bag(b['aujourdhui'] ?? b['Aujourdhui']);
    const per = this.bag(b['periodeResume'] ?? b['PeriodeResume']);
    const imp = this.bag(b['impayes'] ?? b['Impayes']);
    const files = this.bag(b['files'] ?? b['Files']);
    const ref = this.bag(b['referentiels'] ?? b['Referentiels']);
    const periode = this.bag(b['periode'] ?? b['Periode']);

    const cards: DashboardKpiCard[] = [
      {
        id: 'fa-jour',
        label: 'CA factures (jour)',
        value: this.money(this.num(auj['facturesCaTtc'] ?? auj['FacturesCaTtc'])),
        hint: `${this.int(auj['facturesNb'] ?? auj['FacturesNb'])} facture(s)`,
        tone: 'accent',
        route: '/vente/factures',
      },
      {
        id: 'fa-mois',
        label: 'CA factures (période)',
        value: this.money(this.num(per['facturesCaTtc'] ?? per['FacturesCaTtc'])),
        hint: `${this.int(per['facturesNb'] ?? per['FacturesNb'])} facture(s)`,
        route: '/vente/factures',
      },
      {
        id: 'devis-mois',
        label: 'CA devis (période)',
        value: this.money(this.num(per['devisCaTtc'] ?? per['DevisCaTtc'])),
        hint: `${this.int(per['devisNb'] ?? per['DevisNb'])} devis`,
        route: '/vente/devis',
      },
      {
        id: 'impayes',
        label: 'Reste à encaisser',
        value: this.money(this.num(imp['resteAPayer'] ?? imp['ResteAPayer'])),
        hint: `${this.int(imp['nb'] ?? imp['Nb'])} facture(s) impayée(s)`,
        tone: 'warn',
        route: '/recouvrement',
      },
      {
        id: 'da',
        label: "Demandes d'achat ouvertes",
        value: String(this.int(files['demandesAchatOuvertes'] ?? files['DemandesAchatOuvertes'])),
        route: '/achat/demandes-achat-admin',
      },
      {
        id: 'stock',
        label: 'Articles sous mini',
        value: String(this.int(files['articlesSousMini'] ?? files['ArticlesSousMini'])),
        hint: `${this.int(files['stocksSousMini'] ?? files['StocksSousMini'])} ligne(s)`,
        tone: this.int(files['articlesSousMini'] ?? files['ArticlesSousMini']) > 0 ? 'warn' : 'ok',
        route: '/depot/mouvements-stock',
      },
      {
        id: 'inv',
        label: 'Inventaires à valider',
        value: String(this.int(files['inventairesAValider'] ?? files['InventairesAValider'])),
        route: '/depot/inventaire',
      },
      {
        id: 'encours',
        label: 'Encours clients',
        value: this.money(this.num(ref['encoursClientsTotal'] ?? ref['EncoursClientsTotal'])),
        hint: `${this.int(ref['clientsAvecEncoursNb'] ?? ref['ClientsAvecEncoursNb'])} client(s)`,
        route: '/vente/clients',
      },
    ];

    const topClients = this.arr(b['topClientsCa'] ?? b['TopClientsCa']).map((r) => {
      const row = this.bag(r);
      return {
        title: String(row['clientIntitule'] ?? row['ClientIntitule'] ?? row['clientNumero'] ?? '—'),
        subtitle: String(row['clientNumero'] ?? row['ClientNumero'] ?? ''),
        value: this.money(this.num(row['caTtc'] ?? row['CaTtc'])),
        route: '/vente/clients',
      } satisfies DashboardKpiListItem;
    });

    const impayees = this.arr(b['facturesImpayees'] ?? b['FacturesImpayees']).map((r) => {
      const row = this.bag(r);
      return {
        title: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? '—'),
        subtitle: String(row['clientIntitule'] ?? row['ClientIntitule'] ?? ''),
        value: this.money(this.num(row['resteAPayer'] ?? row['ResteAPayer'])),
        route: `/vente/factures/${encodeURIComponent(String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''))}`,
      } satisfies DashboardKpiListItem;
    });

    return {
      mode: 'admin',
      periodeLabel: this.periodeLabel(periode),
      cards,
      lists: [
        { title: 'Top clients (période)', items: topClients, empty: 'Aucun CA sur la période' },
        { title: 'Factures impayées', items: impayees, empty: 'Aucune facture impayée' },
      ],
    };
  }

  private mapCommercial(raw: unknown, mes: boolean): DashboardKpiBundle {
    const b = this.bag(raw);
    const devis = this.bag(b['devis'] ?? b['Devis']);
    const fa = this.bag(b['factures'] ?? b['Factures']);
    const clients = this.bag(b['clients'] ?? b['Clients']);
    const periode = this.bag(b['periode'] ?? b['Periode']);

    const cards: DashboardKpiCard[] = [
      {
        id: 'fa-ca',
        label: mes ? 'Mon CA factures' : 'CA factures',
        value: this.money(this.num(fa['periodeCaTtc'] ?? fa['PeriodeCaTtc'])),
        hint: `${this.int(fa['periodeNb'] ?? fa['PeriodeNb'])} facture(s)`,
        tone: 'accent',
        route: '/vente/factures',
      },
      {
        id: 'devis-ca',
        label: mes ? 'Mon CA devis' : 'CA devis',
        value: this.money(this.num(devis['periodeCaTtc'] ?? devis['PeriodeCaTtc'])),
        hint: `${this.int(devis['periodeNb'] ?? devis['PeriodeNb'])} devis`,
        route: '/vente/devis',
      },
      {
        id: 'attente',
        label: 'Devis en attente',
        value: String(this.int(devis['enAttenteAdmin'] ?? devis['EnAttenteAdmin'])),
        route: '/vente/devis',
      },
      {
        id: 'impayes',
        label: 'Reste à encaisser',
        value: this.money(this.num(fa['resteAPayer'] ?? fa['ResteAPayer'])),
        hint: `${this.int(fa['impayeesNb'] ?? fa['ImpayeesNb'])} impayée(s)`,
        tone: 'warn',
        route: '/recouvrement',
      },
      {
        id: 'encours',
        label: 'Encours clients',
        value: this.money(this.num(clients['encoursTotal'] ?? clients['EncoursTotal'])),
        hint: `${this.int(clients['avecEncoursNb'] ?? clients['AvecEncoursNb'])} client(s)`,
        route: '/vente/clients',
      },
    ];

    const topClients = this.arr(b['topClientsCa'] ?? b['TopClientsCa']).map((r) => {
      const row = this.bag(r);
      return {
        title: String(row['clientIntitule'] ?? row['ClientIntitule'] ?? '—'),
        subtitle: String(row['clientNumero'] ?? row['ClientNumero'] ?? ''),
        value: this.money(this.num(row['caTtc'] ?? row['CaTtc'])),
      } satisfies DashboardKpiListItem;
    });

    const impayees = this.arr(b['facturesImpayees'] ?? b['FacturesImpayees']).map((r) => {
      const row = this.bag(r);
      const piece = String(row['numeroPiece'] ?? row['NumeroPiece'] ?? '');
      return {
        title: piece || '—',
        subtitle: String(row['clientIntitule'] ?? row['ClientIntitule'] ?? ''),
        value: this.money(this.num(row['resteAPayer'] ?? row['ResteAPayer'])),
        route: piece ? `/vente/factures/${encodeURIComponent(piece)}` : undefined,
      } satisfies DashboardKpiListItem;
    });

    return {
      mode: 'commercial',
      periodeLabel: this.periodeLabel(periode),
      cards,
      lists: [
        { title: 'Top clients', items: topClients, empty: 'Aucun CA' },
        { title: 'Factures impayées', items: impayees, empty: 'RAS' },
      ],
    };
  }

  private mapDepot(raw: unknown): DashboardKpiBundle {
    const b = this.bag(raw);
    const auj = this.bag(b['aujourdhui'] ?? b['Aujourdhui']);
    const stocks = this.bag(b['stocks'] ?? b['Stocks']);
    const files = this.bag(b['files'] ?? b['Files']);
    const ref = this.bag(b['referentiels'] ?? b['Referentiels']);

    const cards: DashboardKpiCard[] = [
      {
        id: 'sous-mini',
        label: 'Articles sous mini',
        value: String(this.int(stocks['articlesSousMini'] ?? stocks['ArticlesSousMini'])),
        hint: `${this.int(stocks['lignesSousMini'] ?? stocks['LignesSousMini'])} ligne(s)`,
        tone: this.int(stocks['articlesSousMini'] ?? stocks['ArticlesSousMini']) > 0 ? 'warn' : 'ok',
        route: '/depot/mouvements-stock',
      },
      {
        id: 'inv',
        label: 'Inventaires à valider',
        value: String(this.int(files['inventairesAValider'] ?? files['InventairesAValider'])),
        route: '/depot/inventaire',
      },
      {
        id: 'br',
        label: 'Bons de retour (jour)',
        value: String(this.int(auj['bonsRetourNb'] ?? auj['BonsRetourNb'])),
        route: '/depot/bons-retour',
      },
      {
        id: 'bl',
        label: 'Réceptions (jour)',
        value: String(this.int(auj['receptionsNb'] ?? auj['ReceptionsNb'])),
        route: '/achat/bl-achat',
      },
      {
        id: 'art',
        label: 'Articles actifs',
        value: String(this.int(ref['articlesActifs'] ?? ref['ArticlesActifs'])),
        route: '/articles',
      },
    ];

    const critiques = this.arr(stocks['critiques'] ?? stocks['Critiques']).map((r) => {
      const row = this.bag(r);
      return {
        title: String(row['reference'] ?? row['Reference'] ?? '—'),
        subtitle: String(row['designation'] ?? row['Designation'] ?? row['depotIntitule'] ?? ''),
        value: `dispo ${this.fmtQty(this.num(row['disponible'] ?? row['Disponible']))}`,
        route: '/articles',
      } satisfies DashboardKpiListItem;
    });

    return {
      mode: 'depot',
      periodeLabel: 'Aujourd\'hui',
      cards,
      lists: [
        { title: 'Stocks critiques', items: critiques, empty: 'Aucun stock sous minimum' },
      ],
    };
  }

  private empty(mode: DashboardKpiBundle['mode']): DashboardKpiBundle {
    return { mode, cards: [], lists: [] };
  }

  private periodeLabel(periode: Record<string, unknown>): string | undefined {
    const d = periode['debut'] ?? periode['Debut'];
    const f = periode['fin'] ?? periode['Fin'];
    if (!d && !f) return undefined;
    const fmt = (v: unknown) => {
      if (!v) return '—';
      const s = String(v);
      if (s.length >= 10) return s.slice(0, 10);
      return s;
    };
    return `${fmt(d)} → ${fmt(f)}`;
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

  private arr(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
  }

  private num(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private int(v: unknown): number {
    return Math.round(this.num(v));
  }

  private money(n: number): string {
    return (
      new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar'
    );
  }

  private fmtQty(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error as ApiResponse | undefined;
    if (body?.message) return body.message;
    if (http?.status === 403) return 'Accès KPI refusé pour ce profil.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur KPI';
  }
}

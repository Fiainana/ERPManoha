import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  EtatVenteItem,
  EtatVenteResult,
  EtatVenteScope,
  JournalCaisseItem,
  JournalCaisseResult,
} from '../models/etat-vente.model';

@Injectable({ providedIn: 'root' })
export class EtatVenteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/factures`;

  getListe(scope: EtatVenteScope, dateDebut: string, dateFin: string) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/etat-vente/${scope}`, {
        dateDebut,
        dateFin,
      })
      .pipe(
        map((res) => this.normalizeEtat(this.unwrap(res))),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  downloadPdf(scope: EtatVenteScope, dateDebut: string, dateFin: string) {
    return this.downloadFile(
      `${this.base}/etat-vente/${scope}/pdf`,
      { dateDebut, dateFin },
      this.nomFichier(scope, dateDebut, dateFin, 'pdf')
    );
  }

  downloadExcel(scope: EtatVenteScope, dateDebut: string, dateFin: string) {
    return this.downloadFile(
      `${this.base}/etat-vente/${scope}/excel`,
      { dateDebut, dateFin },
      this.nomFichier(scope, dateDebut, dateFin, 'csv')
    );
  }

  /** Nom de repli si l'en-tête Content-Disposition n'est pas lisible (CORS). */
  private nomFichier(scope: EtatVenteScope, dateDebut: string, dateFin: string, ext: string): string {
    const d = (s: string) => s.replaceAll('-', '');
    const periode = dateDebut === dateFin ? d(dateDebut) : `${d(dateDebut)}_${d(dateFin)}`;
    return `Etat-vente-${scope}-${periode}.${ext}`;
  }

  getJournalCaisse(date: string, comptoirUniquement = true) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/journal-caisse`, {
        date,
        comptoirUniquement,
      })
      .pipe(
        map((res) => this.normalizeJournal(this.unwrap(res))),
        catchError((err) => throwError(() => new Error(this.readError(err))))
      );
  }

  private downloadFile(url: string, body: object, nomParDefaut: string) {
    return this.http.post(url, body, { responseType: 'blob', observe: 'response' }).pipe(
      map((resp) => {
        const blob = resp.body;
        if (!blob || blob.size === 0) throw new Error('Fichier vide');
        if (blob.type && blob.type.includes('json')) {
          throw new Error('Erreur lors de la génération du fichier');
        }
        const cd = resp.headers.get('content-disposition') || '';
        const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(cd);
        const fileName = match ? decodeURIComponent(match[1].replace(/"/g, '')) : nomParDefaut;
        // Type explicite : sans lui, certains navigateurs enregistrent un .bin.
        const type = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type || 'text/csv';
        const objectUrl = URL.createObjectURL(new Blob([blob], { type }));
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Révocation différée : une révocation immédiate peut annuler le téléchargement.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
        return fileName;
      }),
      catchError((err) => throwError(() => new Error(this.readError(err))))
    );
  }

  private unwrap(res: unknown): unknown {
    if (!res || typeof res !== 'object') return res;
    const o = res as Record<string, unknown>;
    if ('data' in o && o['data'] != null) return o['data'];
    if ('Data' in o && o['Data'] != null) return o['Data'];
    return res;
  }

  private normalizeEtat(raw: unknown): EtatVenteResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rows = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    return {
      scope: String(bag['scope'] ?? bag['Scope'] ?? ''),
      titre: String(bag['titre'] ?? bag['Titre'] ?? 'État de vente'),
      date: (bag['date'] ?? bag['Date']) as string | null,
      dateDebut: (bag['dateDebut'] ?? bag['DateDebut']) as string | null,
      dateFin: (bag['dateFin'] ?? bag['DateFin']) as string | null,
      clientComptoir: (bag['clientComptoir'] ?? bag['ClientComptoir']) as string | null,
      count: Number(bag['count'] ?? bag['Count'] ?? rows.length),
      totalHT: this.num(bag['totalHT'] ?? bag['TotalHT']) ?? 0,
      totalTTC: this.num(bag['totalTTC'] ?? bag['TotalTTC']) ?? 0,
      totalRegle: this.num(bag['totalRegle'] ?? bag['TotalRegle']) ?? 0,
      totalReste: this.num(bag['totalReste'] ?? bag['TotalReste']) ?? 0,
      items: rows.map((r) => this.normalizeItem(r)),
    };
  }

  private normalizeItem(row: Record<string, unknown>): EtatVenteItem {
    return {
      numeroPiece: String(row['numeroPiece'] ?? row['NumeroPiece'] ?? ''),
      dateDocument: (row['dateDocument'] ?? row['DateDocument']) as string | null,
      clientNumero: (row['clientNumero'] ?? row['ClientNumero']) as string | null,
      clientIntitule: (row['clientIntitule'] ?? row['ClientIntitule']) as string | null,
      nomClient: (row['nomClient'] ?? row['NomClient']) as string | null,
      numClient: (row['numClient'] ?? row['NumClient']) as string | null,
      clientAffiche: (row['clientAffiche'] ?? row['ClientAffiche']) as string | null,
      telephone: (row['telephone'] ?? row['Telephone']) as string | null,
      representant: (row['representant'] ?? row['Representant']) as string | null,
      reference: (row['reference'] ?? row['Reference']) as string | null,
      totalHT: this.num(row['totalHT'] ?? row['TotalHT']),
      totalTTC: this.num(row['totalTTC'] ?? row['TotalTTC']),
      montantRegle: this.num(row['montantRegle'] ?? row['MontantRegle']),
      resteAPayer: this.num(row['resteAPayer'] ?? row['ResteAPayer']),
    };
  }

  private normalizeJournal(raw: unknown): JournalCaisseResult {
    const bag = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const items = (bag['items'] || bag['Items'] || []) as Record<string, unknown>[];
    const parMode = (bag['parMode'] || bag['ParMode'] || []) as Record<string, unknown>[];
    const parJournal = (bag['parJournal'] || bag['ParJournal'] || []) as Record<string, unknown>[];

    return {
      date: String(bag['date'] ?? bag['Date'] ?? ''),
      comptoirUniquement: Boolean(bag['comptoirUniquement'] ?? bag['ComptoirUniquement'] ?? true),
      clientComptoir: (bag['clientComptoir'] ?? bag['ClientComptoir']) as string | null,
      count: Number(bag['count'] ?? bag['Count'] ?? items.length),
      totalEncaissements: this.num(bag['totalEncaissements'] ?? bag['TotalEncaissements']) ?? 0,
      parMode: parMode.map((m) => ({
        mode: String(m['mode'] ?? m['Mode'] ?? '—'),
        count: Number(m['count'] ?? m['Count'] ?? 0),
        total: this.num(m['total'] ?? m['Total']) ?? 0,
      })),
      parJournal: parJournal.map((j) => ({
        journal: String(j['journal'] ?? j['Journal'] ?? '—'),
        count: Number(j['count'] ?? j['Count'] ?? 0),
        total: this.num(j['total'] ?? j['Total']) ?? 0,
      })),
      items: items.map((r) => this.normalizeJournalItem(r)),
    };
  }

  private normalizeJournalItem(row: Record<string, unknown>): JournalCaisseItem {
    return {
      numero: (row['numero'] ?? row['Numero']) as string | null,
      dateReglement: (row['dateReglement'] ?? row['DateReglement']) as string | null,
      montant: this.num(row['montant'] ?? row['Montant']) ?? 0,
      libelle: (row['libelle'] ?? row['Libelle']) as string | null,
      clientNumero: (row['clientNumero'] ?? row['ClientNumero']) as string | null,
      clientIntitule: (row['clientIntitule'] ?? row['ClientIntitule']) as string | null,
      codeJournal: (row['codeJournal'] ?? row['CodeJournal']) as string | null,
      journalIntitule: (row['journalIntitule'] ?? row['JournalIntitule']) as string | null,
      modeIndex: (row['modeIndex'] ?? row['ModeIndex']) as string | null,
      modeIntitule: (row['modeIntitule'] ?? row['ModeIntitule']) as string | null,
    };
  }

  private num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private readError(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.error instanceof Blob) {
      return http.status === 403 ? 'Accès refusé (Admin requis).' : `Erreur (${http.status})`;
    }
    const body = http?.error as ApiResponse | undefined;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (http?.status === 403) return 'Accès réservé aux administrateurs.';
    if (http?.status === 503) return 'Service Sage indisponible.';
    return http?.message || 'Erreur état de vente';
  }
}

import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuiviGpsService } from '../../core/services/suivi-gps.service';
import {
  ActiviteCommercial,
  ActiviteJour,
  RapportActivite,
} from '../../core/models/suivi-gps.model';

type Mode = 'commercial' | 'jour';
type Preset = 'jour' | '7j' | 'mois' | 'mois-prec' | '30j';

interface Colonne<T> {
  id: string;
  libelle: string;
  num?: boolean;
  valeur: (r: T) => number | string;
}

/** Totaux affichés en pied de tableau (communs aux deux modes). */
interface Totaux {
  sessions: number;
  dureeSecondes: number;
  distanceMetres: number;
  devis: number;
  montantDevisTtc: number;
  devisFactures: number;
  montantFactureTtc: number;
  joursActifs: number;
}

/**
 * Tableau d'activité des commerciaux sur une période : synthèse par commercial
 * ou détail par jour. Un clic sur une ligne ouvre le trajet correspondant sur la carte.
 */
@Component({
  selector: 'app-suivi-gps-tableau',
  imports: [FormsModule, DatePipe],
  templateUrl: './suivi-gps-tableau.component.html',
  styleUrl: './suivi-gps-tableau.component.scss',
})
export class SuiviGpsTableauComponent implements OnInit {
  private readonly api = inject(SuiviGpsService);

  /** Demande d'affichage d'une journée sur la carte. */
  readonly ouvrirJournee = output<{ userId: number; date: string }>();

  readonly rapport = signal<RapportActivite | null>(null);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly mode = signal<Mode>('commercial');
  readonly preset = signal<Preset | null>('7j');
  readonly tri = signal<{ col: string; asc: boolean }>({ col: 'duree', asc: false });
  readonly filtreUser = signal<number>(0);
  readonly recherche = signal('');

  debut = '';
  fin = '';

  readonly colonnesCommercial: Colonne<ActiviteCommercial>[] = [
    { id: 'commercial', libelle: 'Commercial', valeur: (r) => r.libelle.toLowerCase() },
    { id: 'jours', libelle: 'Jours actifs', num: true, valeur: (r) => r.joursActifs },
    { id: 'sessions', libelle: 'Sessions', num: true, valeur: (r) => r.sessions },
    { id: 'duree', libelle: "Temps d'activité", num: true, valeur: (r) => r.dureeSecondes },
    { id: 'moyenne', libelle: 'Moyenne / jour', num: true, valeur: (r) => this.moyenne(r) },
    { id: 'distance', libelle: 'Distance', num: true, valeur: (r) => r.distanceMetres },
    { id: 'devis', libelle: 'Devis', num: true, valeur: (r) => r.devis },
    { id: 'montantDevis', libelle: 'Montant devis', num: true, valeur: (r) => r.montantDevisTtc },
    { id: 'factures', libelle: 'Facturés', num: true, valeur: (r) => r.devisFactures },
    { id: 'montantFacture', libelle: 'Montant facturé', num: true, valeur: (r) => r.montantFactureTtc },
    { id: 'taux', libelle: 'Transfo.', num: true, valeur: (r) => this.taux(r.devisFactures, r.devis) },
    { id: 'derniere', libelle: 'Dernière activité', valeur: (r) => r.derniereActivite ?? '' },
  ];

  readonly colonnesJour: Colonne<ActiviteJour>[] = [
    { id: 'jour', libelle: 'Date', valeur: (r) => r.jour },
    { id: 'commercial', libelle: 'Commercial', valeur: (r) => r.libelle.toLowerCase() },
    { id: 'debut', libelle: 'Début', valeur: (r) => r.premiereActivite ?? '' },
    { id: 'fin', libelle: 'Fin', valeur: (r) => r.derniereActivite ?? '' },
    { id: 'sessions', libelle: 'Sessions', num: true, valeur: (r) => r.sessions },
    { id: 'duree', libelle: "Temps d'activité", num: true, valeur: (r) => r.dureeSecondes },
    { id: 'distance', libelle: 'Distance', num: true, valeur: (r) => r.distanceMetres },
    { id: 'points', libelle: 'Points GPS', num: true, valeur: (r) => r.nbPoints },
    { id: 'devis', libelle: 'Devis', num: true, valeur: (r) => r.devis },
    { id: 'montantDevis', libelle: 'Montant devis', num: true, valeur: (r) => r.montantDevisTtc },
    { id: 'factures', libelle: 'Facturés', num: true, valeur: (r) => r.devisFactures },
    { id: 'montantFacture', libelle: 'Montant facturé', num: true, valeur: (r) => r.montantFactureTtc },
  ];

  /** Commerciaux de la période (pour le filtre). */
  readonly listeCommerciaux = computed(() =>
    [...(this.rapport()?.commerciaux ?? [])].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
  );

  readonly lignesCommercial = computed(() =>
    this.trier(
      (this.rapport()?.commerciaux ?? []).filter((r) => this.garder(r.userId, r.libelle)),
      this.colonnesCommercial
    )
  );

  readonly lignesJour = computed(() =>
    this.trier(
      (this.rapport()?.lignes ?? []).filter((r) => this.garder(r.userId, r.libelle)),
      this.colonnesJour
    )
  );

  readonly totaux = computed<Totaux>(() => {
    const src = this.mode() === 'commercial' ? this.lignesCommercial() : this.lignesJour();
    const t: Totaux = {
      sessions: 0, dureeSecondes: 0, distanceMetres: 0, devis: 0,
      montantDevisTtc: 0, devisFactures: 0, montantFactureTtc: 0, joursActifs: 0,
    };
    for (const r of src) {
      t.sessions += r.sessions;
      t.dureeSecondes += r.dureeSecondes;
      t.distanceMetres += r.distanceMetres;
      t.devis += r.devis;
      t.montantDevisTtc += r.montantDevisTtc;
      t.devisFactures += r.devisFactures;
      t.montantFactureTtc += r.montantFactureTtc;
      t.joursActifs += 'joursActifs' in r ? r.joursActifs : r.nbPoints > 0 ? 1 : 0;
    }
    return t;
  });

  ngOnInit(): void {
    this.appliquerPreset('7j');
  }

  // ── Période ──────────────────────────────────────────────────────────

  appliquerPreset(p: Preset): void {
    const auj = new Date();
    let d = new Date(auj);
    let f = new Date(auj);
    switch (p) {
      case 'jour':
        break;
      case '7j':
        d.setDate(d.getDate() - 6);
        break;
      case '30j':
        d.setDate(d.getDate() - 29);
        break;
      case 'mois':
        d = new Date(auj.getFullYear(), auj.getMonth(), 1);
        break;
      case 'mois-prec':
        d = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
        f = new Date(auj.getFullYear(), auj.getMonth(), 0);
        break;
    }
    this.debut = this.iso(d);
    this.fin = this.iso(f);
    this.preset.set(p);
    this.charger();
  }

  onPeriodeChange(): void {
    this.preset.set(null);
    if (this.debut && this.fin) this.charger();
  }

  charger(): void {
    if (!this.debut || !this.fin) return;
    if (this.debut > this.fin) {
      this.erreur.set('La date de début doit précéder la date de fin.');
      return;
    }
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.rapport(this.debut, this.fin).subscribe({
      next: (r) => {
        this.rapport.set(r);
        this.chargement.set(false);
        if (this.filtreUser() && !r.commerciaux.some((c) => c.userId === this.filtreUser())) {
          this.filtreUser.set(0);
        }
      },
      error: (e: Error) => {
        this.chargement.set(false);
        this.erreur.set(e.message);
      },
    });
  }

  // ── Tableau ──────────────────────────────────────────────────────────

  changerMode(m: Mode): void {
    this.mode.set(m);
    // Tri par défaut : les plus actifs d'abord, ou les jours les plus récents.
    this.tri.set(m === 'commercial' ? { col: 'duree', asc: false } : { col: 'jour', asc: false });
  }

  trierPar(col: string): void {
    const t = this.tri();
    // Nouvelle colonne : décroissant pour les nombres et les dates (plus récent d'abord), croissant pour les noms.
    const asc = t.col === col ? !t.asc : col === 'commercial';
    this.tri.set({ col, asc });
  }

  indicateurTri(col: string): 'ascending' | 'descending' | 'none' {
    const t = this.tri();
    return t.col !== col ? 'none' : t.asc ? 'ascending' : 'descending';
  }

  ouvrirJour(r: ActiviteJour): void {
    this.ouvrirJournee.emit({ userId: r.userId, date: r.jour });
  }

  /** Synthèse : ouvre le dernier jour d'activité du commercial. */
  ouvrirCommercial(r: ActiviteCommercial): void {
    const dernier = (this.rapport()?.lignes ?? [])
      .filter((l) => l.userId === r.userId)
      .map((l) => l.jour)
      .sort()
      .pop();
    this.ouvrirJournee.emit({ userId: r.userId, date: dernier ?? this.fin });
  }

  exporterCsv(): void {
    const sep = ';';
    const lignes: string[] = [];
    if (this.mode() === 'commercial') {
      lignes.push(
        ['Commercial', 'Jours actifs', 'Sessions', 'Temps (min)', 'Moyenne / jour (min)', 'Distance (km)',
          'Devis', 'Montant devis', 'Facturés', 'Montant facturé', 'Transformation (%)', 'Dernière activité'].join(sep)
      );
      for (const r of this.lignesCommercial()) {
        lignes.push([
          r.libelle, r.joursActifs, r.sessions, Math.round(r.dureeSecondes / 60), Math.round(this.moyenne(r) / 60),
          this.km(r.distanceMetres), r.devis, Math.round(r.montantDevisTtc), r.devisFactures,
          Math.round(r.montantFactureTtc), this.taux(r.devisFactures, r.devis).toFixed(0),
          r.derniereActivite ? new Date(r.derniereActivite).toLocaleString('fr-FR') : '',
        ].map((v) => this.csv(v)).join(sep));
      }
    } else {
      lignes.push(
        ['Date', 'Commercial', 'Début', 'Fin', 'Sessions', 'Temps (min)', 'Distance (km)', 'Points GPS',
          'Devis', 'Montant devis', 'Facturés', 'Montant facturé'].join(sep)
      );
      for (const r of this.lignesJour()) {
        lignes.push([
          r.jour, r.libelle, this.heure(r.premiereActivite), this.heure(r.derniereActivite), r.sessions,
          Math.round(r.dureeSecondes / 60), this.km(r.distanceMetres), r.nbPoints, r.devis,
          Math.round(r.montantDevisTtc), r.devisFactures, Math.round(r.montantFactureTtc),
        ].map((v) => this.csv(v)).join(sep));
      }
    }
    // BOM : Excel lit l'UTF-8 correctement.
    const blob = new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Activite-commerciaux-${this.mode()}-${this.debut.replaceAll('-', '')}_${this.fin.replaceAll('-', '')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  // ── Format ───────────────────────────────────────────────────────────

  duree(sec: number): string {
    const s = Math.max(0, Math.round(sec));
    if (s === 0) return '—';
    if (s < 60) return `${s} s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  }

  distance(m: number): string {
    if (!m) return '—';
    return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`;
  }

  ar(n: number): string {
    return n ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) : '—';
  }

  heure(iso: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
  }

  moyenne(r: ActiviteCommercial): number {
    return r.joursActifs > 0 ? r.dureeSecondes / r.joursActifs : 0;
  }

  taux(factures: number, devis: number): number {
    return devis > 0 ? (factures / devis) * 100 : 0;
  }

  /** Part du temps d'activité du commercial par rapport au plus actif (barre de la colonne). */
  partDuree(sec: number): number {
    const max = Math.max(...this.lignesCommercial().map((r) => r.dureeSecondes), 1);
    return Math.round((sec / max) * 100);
  }

  // ── Interne ──────────────────────────────────────────────────────────

  private garder(userId: number, libelle: string): boolean {
    const f = this.filtreUser();
    if (f && userId !== f) return false;
    const q = this.recherche().trim().toLowerCase();
    return !q || libelle.toLowerCase().includes(q);
  }

  private trier<T>(rows: T[], colonnes: Colonne<T>[]): T[] {
    const t = this.tri();
    const col = colonnes.find((c) => c.id === t.col) ?? colonnes[0];
    const sens = t.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.valeur(a);
      const vb = col.valeur(b);
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'fr');
      return cmp * sens;
    });
  }

  private km(m: number): string {
    return (m / 1000).toFixed(1).replace('.', ',');
  }

  private csv(v: string | number): string {
    const s = String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }

  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

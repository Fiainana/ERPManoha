import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyseService } from '../../core/services/analyse.service';
import { VenteJourArticle, VentesJournalieres } from '../../core/models/analyse.model';
import { compact } from './analyse-format';

type Metrique = 'qte' | 'ca';
type Tri = 'fournisseur' | 'total' | 'designation' | 'reference';

/** Une colonne du tableau : un jour de la période. */
interface Colonne {
  iso: string;
  n: number;
  wd: string;
  weekend: boolean;
  titre: string;
}

interface LigneArticle {
  a: VenteJourArticle;
  cells: (number | null)[];
  total: number;
}

interface Groupe {
  code: string;
  nom: string;
  nbArticles: number;
  cells: number[];
  total: number;
}

interface Bloc {
  cle: string;
  groupe: Groupe | null;
  rows: LigneArticle[];
}

const JOURS_MAX = 62;
const INITIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parse(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

const NF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/**
 * Ventes journalières par article : un tableau article × jour (quantités ou CA TTC), regroupé par fournisseur
 * principal, avec totaux par jour, recherche, tri et export CSV. Retours déduits.
 */
@Component({
  selector: 'app-analyse-ventes-journalieres-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './analyse-ventes-journalieres.page.html',
  styleUrl: './analyse-ventes-journalieres.page.scss',
})
export class AnalyseVentesJournalieresPage {
  private readonly api = inject(AnalyseService);

  readonly debut = signal(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly fin = signal(iso(new Date()));
  readonly fournisseur = signal('');
  readonly recherche = signal('');
  readonly metrique = signal<Metrique>('qte');
  readonly tri = signal<Tri>('fournisseur');

  readonly data = signal<VentesJournalieres | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private requete = 0;

  constructor() {
    this.charger();
  }

  // ———————————————————————— Période ————————————————————————

  /** « novembre 2026 » pour un mois entier (ou en cours), sinon « 03/11/2026 – 10/11/2026 ». */
  readonly libellePeriode = computed(() => {
    const d = parse(this.debut());
    const f = parse(this.fin());
    const dernierDuMois = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const memeMois = d.getDate() === 1 && f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth();
    if (memeMois && (f.getDate() === dernierDuMois.getDate() || this.estAujourdhui(f))) {
      return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
    }
    const fr = (x: Date) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
    return `${fr(d)} – ${fr(f)}`;
  });

  readonly estMoisCourant = computed(() => {
    const d = parse(this.debut());
    const a = new Date();
    return d.getFullYear() === a.getFullYear() && d.getMonth() === a.getMonth();
  });

  private estAujourdhui(d: Date): boolean {
    const a = new Date();
    return d.getFullYear() === a.getFullYear() && d.getMonth() === a.getMonth() && d.getDate() === a.getDate();
  }

  decalerMois(delta: number): void {
    const d = parse(this.debut());
    const premier = new Date(d.getFullYear(), d.getMonth() + delta, 1);
    this.moisEntier(premier);
  }

  private moisEntier(premier: Date): void {
    const dernier = new Date(premier.getFullYear(), premier.getMonth() + 1, 0);
    const a = new Date();
    const fin = dernier > a ? a : dernier;
    this.majPeriode(iso(premier), iso(fin));
  }

  moisCourant(): void {
    const a = new Date();
    this.moisEntier(new Date(a.getFullYear(), a.getMonth(), 1));
  }

  moisPrecedent(): void {
    const a = new Date();
    this.moisEntier(new Date(a.getFullYear(), a.getMonth() - 1, 1));
  }

  septDerniersJours(): void {
    const a = new Date();
    this.majPeriode(iso(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 6)), iso(a));
  }

  majPeriode(debut: string, fin: string): void {
    if (!debut || !fin) return;
    this.debut.set(debut);
    this.fin.set(fin);
    this.charger();
  }

  // ———————————————————————— Chargement ————————————————————————

  charger(): void {
    const d = parse(this.debut());
    const f = parse(this.fin());
    const nb = Math.round((f.getTime() - d.getTime()) / 86_400_000) + 1;
    if (nb < 1) {
      this.error.set('La date de début doit précéder la date de fin.');
      return;
    }
    if (nb > JOURS_MAX) {
      this.error.set(`La période ne peut pas dépasser ${JOURS_MAX} jours (une colonne par jour).`);
      return;
    }

    const id = ++this.requete;
    this.loading.set(true);
    this.error.set(null);
    this.api.ventesJournalieres(this.debut(), this.fin(), this.fournisseur() || undefined).subscribe({
      next: (r) => {
        if (id !== this.requete) return;
        this.data.set(r);
        this.loading.set(false);
      },
      error: (e: Error) => {
        if (id !== this.requete) return;
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  choisirFournisseur(code: string): void {
    this.fournisseur.set(code);
    this.charger();
  }

  reinitialiser(): void {
    this.recherche.set('');
    this.tri.set('fournisseur');
    this.metrique.set('qte');
    if (this.fournisseur()) {
      this.fournisseur.set('');
      this.charger();
    }
  }

  readonly filtreActif = computed(
    () => !!this.recherche().trim() || !!this.fournisseur() || this.tri() !== 'fournisseur' || this.metrique() !== 'qte'
  );

  // ———————————————————————— Vue calculée ————————————————————————

  readonly vue = computed(() => {
    const d = this.data();
    if (!d) return null;

    const colonnes: Colonne[] = d.jours.map((j) => {
      const date = parse(j.date);
      const w = date.getDay();
      return {
        iso: j.date,
        n: date.getDate(),
        wd: INITIALES[w],
        weekend: w === 0 || w === 6,
        titre: `${NOMS_JOURS[w]} ${date.getDate()} ${MOIS[date.getMonth()]}`,
      };
    });
    const index = new Map(colonnes.map((c, i) => [c.iso, i]));
    const q = this.recherche().trim().toLowerCase();
    const m = this.metrique();

    const rows: LigneArticle[] = d.articles
      .filter((a) => !q || a.reference.toLowerCase().includes(q) || a.designation.toLowerCase().includes(q))
      .map((a) => {
        const cells: (number | null)[] = new Array(colonnes.length).fill(null);
        for (const c of a.jours) {
          const i = index.get(c.date);
          if (i !== undefined) cells[i] = m === 'qte' ? c.qte : c.caTtc;
        }
        return { a, cells, total: m === 'qte' ? a.qte : a.caTtc };
      });

    const tri = this.tri();
    const parNom = (x: LigneArticle, y: LigneArticle) => x.a.designation.localeCompare(y.a.designation, 'fr', { sensitivity: 'base' });
    const parTotal = (x: LigneArticle, y: LigneArticle) => y.total - x.total;
    const parFournisseur = (x: LigneArticle, y: LigneArticle) => {
      // « Sans fournisseur » (code « - ») toujours en dernier.
      const sx = x.a.fournisseurCode === '-' ? 1 : 0;
      const sy = y.a.fournisseurCode === '-' ? 1 : 0;
      return sx - sy || x.a.fournisseurNom.localeCompare(y.a.fournisseurNom, 'fr', { sensitivity: 'base' }) || parTotal(x, y);
    };
    rows.sort(
      tri === 'total' ? parTotal
        : tri === 'designation' ? parNom
        : tri === 'reference' ? (x, y) => x.a.reference.localeCompare(y.a.reference, 'fr', { numeric: true })
        : parFournisseur
    );

    const somme = (liste: LigneArticle[]) =>
      colonnes.map((_, i) => liste.reduce((s, r) => s + (r.cells[i] ?? 0), 0));

    const blocs: Bloc[] = [];
    if (tri === 'fournisseur') {
      for (const r of rows) {
        let b = blocs[blocs.length - 1];
        if (!b || b.groupe?.code !== r.a.fournisseurCode) {
          b = {
            cle: r.a.fournisseurCode,
            groupe: { code: r.a.fournisseurCode, nom: r.a.fournisseurNom, nbArticles: 0, cells: [], total: 0 },
            rows: [],
          };
          blocs.push(b);
        }
        b.rows.push(r);
      }
      for (const b of blocs) {
        b.groupe!.nbArticles = b.rows.length;
        b.groupe!.cells = somme(b.rows);
        b.groupe!.total = b.rows.reduce((s, r) => s + r.total, 0);
      }
    } else {
      blocs.push({ cle: 'tous', groupe: null, rows });
    }

    const totauxJour = somme(rows);
    const total = rows.reduce((s, r) => s + r.total, 0);
    const max = rows.reduce<number>(
      (mx, r) => r.cells.reduce<number>((m2, c) => Math.max(m2, Math.abs(c ?? 0)), mx),
      0
    );

    let meilleur = -1;
    totauxJour.forEach((v, i) => {
      if (meilleur < 0 || v > totauxJour[meilleur]) meilleur = i;
    });
    const nbFournisseurs = new Set(rows.map((r) => r.a.fournisseurCode)).size;
    const joursAvecVente = totauxJour.filter((v) => v !== 0).length;

    return {
      colonnes,
      blocs,
      rows,
      totauxJour,
      total,
      max,
      nbFournisseurs,
      joursAvecVente,
      meilleurJour: meilleur >= 0 && totauxJour[meilleur] > 0 ? { titre: colonnes[meilleur].titre, valeur: totauxJour[meilleur] } : null,
    };
  });

  // ———————————————————————— Affichage ————————————————————————

  /** Valeur d'une cellule : quantité (2 décimales au plus) ou CA compact (42,9 k · 1,2 M). */
  fmt(v: number | null): string {
    if (v === null) return '';
    return this.metrique() === 'qte' ? NF.format(v).replace('-', '−') : compact(v);
  }

  /** Valeur complète pour l'infobulle. */
  titreCellule(v: number | null, col: Colonne): string | null {
    if (v === null) return null;
    const val = this.metrique() === 'qte' ? `${NF.format(v)} vendu(s)` : `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} Ar TTC`;
    return `${col.titre} : ${val}`;
  }

  /** Teinte de la cellule : plus la vente est forte, plus le rouge est soutenu (bleu pour un net négatif). */
  chaleur(v: number | null, max: number): string | null {
    if (v === null || v === 0 || max <= 0) return null;
    const force = Math.min(1, Math.abs(v) / max);
    const alpha = 0.07 + 0.38 * Math.sqrt(force);
    return v > 0 ? `rgba(220, 38, 38, ${alpha.toFixed(3)})` : `rgba(42, 120, 214, ${alpha.toFixed(3)})`;
  }

  libelleMetrique(): string {
    return this.metrique() === 'qte' ? 'Quantité vendue' : 'CA TTC';
  }

  // ———————————————————————— Export ————————————————————————

  exporter(): void {
    const v = this.vue();
    const d = this.data();
    if (!v || !d || v.rows.length === 0) return;

    const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const num = (x: number | null) => (x === null ? '' : String(x).replace('.', ','));
    const lignes: string[] = [];
    lignes.push(['Fournisseur', 'Référence', 'Désignation', ...v.colonnes.map((c) => c.iso), 'Total'].map(esc).join(';'));
    for (const b of v.blocs) {
      for (const r of b.rows) {
        lignes.push(
          [r.a.fournisseurNom, r.a.reference, r.a.designation, ...r.cells.map(num), num(r.total)].map(esc).join(';')
        );
      }
    }
    lignes.push(['', '', 'Total', ...v.totauxJour.map(num), num(v.total)].map(esc).join(';'));

    // BOM UTF-8 : Excel lit correctement les accents.
    const blob = new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventes-journalieres-${d.debut}-${d.fin}-${this.metrique() === 'qte' ? 'quantites' : 'ca-ttc'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

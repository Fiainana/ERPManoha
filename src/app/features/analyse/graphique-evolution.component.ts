import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnalysePeriodeService } from '../../core/services/analyse.service';
import { Granularite, TrancheBase } from '../../core/models/analyse.model';
import { compact } from './analyse-format';

/** Indicateur traçable : champ de la tranche et, si elle existe, sa valeur un an plus tôt. */
export interface IndicateurSerie {
  id: string;
  libelle: string;
  champ: string;
  champN1?: string;
  unite: 'ar' | 'pct' | 'nb';
}

export const GRANULARITES: { id: Granularite; libelle: string }[] = [
  { id: 'auto', libelle: 'Automatique' },
  { id: 'jour', libelle: 'Par jour' },
  { id: 'semaine', libelle: 'Par semaine' },
  { id: 'mois', libelle: 'Par mois' },
  { id: 'trimestre', libelle: 'Par trimestre' },
  { id: 'annee', libelle: 'Par année' },
];

type Forme = 'colonnes' | 'courbe';

const NF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Graduation « ronde » de l'axe des valeurs. */
function graduations(min: number, max: number, n = 4): number[] {
  const etendue = max - min || 1;
  const brut = etendue / n;
  const puissance = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * puissance).find((p) => p >= brut) ?? brut;
  const res: number[] = [];
  for (let v = Math.floor(min / pas) * pas; v <= max + pas * 0.001; v += pas) res.push(Math.round(v * 1000) / 1000);
  if (res[res.length - 1] < max) res.push(res[res.length - 1] + pas);
  return res;
}

/** Colonne à bout arrondi (4 px) côté donnée, carrée côté ligne de base. */
function colonne(x: number, l: number, y0: number, y1: number): string {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return '';
  const r = Math.min(4, l / 2, h);
  const s = y1 < y0 ? 1 : -1;
  return `M${x},${y0} V${y1 + s * r} Q${x},${y1} ${x + r},${y1} H${x + l - r} Q${x + l},${y1} ${x + l},${y1 + s * r} V${y0} Z`;
}

/**
 * Évolution personnalisable : indicateur, découpage (jour → année, partagé avec la période),
 * comparaison avec l'année précédente et forme (colonnes ou courbe). Une seule échelle,
 * infobulle au survol et tableau des valeurs.
 */
@Component({
  selector: 'app-graphique-evolution',
  imports: [FormsModule],
  template: `
    <div class="ge__outils">
      @if (indicateurs().length > 1) {
        <label class="ge__champ">
          <span>Indicateur</span>
          <select [ngModel]="indicateur().id" (ngModelChange)="indicateurId.set($event)">
            @for (i of indicateurs(); track i.id) {
              <option [value]="i.id">{{ i.libelle }}</option>
            }
          </select>
        </label>
      }
      <label class="ge__champ">
        <span>Découpage</span>
        <select [ngModel]="periode.granularite()" (ngModelChange)="periode.decouper($event)">
          @for (g of granularites; track g.id) {
            <option [value]="g.id">{{ g.libelle }}{{ g.id === 'auto' && granulariteEffective() ? ' (' + granulariteEffective() + ')' : '' }}</option>
          }
        </select>
      </label>
      <label class="ge__champ">
        <span>Forme</span>
        <select [ngModel]="forme()" (ngModelChange)="forme.set($event)">
          <option value="colonnes">Colonnes</option>
          <option value="courbe">Courbe</option>
        </select>
      </label>
      @if (indicateur().champN1) {
        <label class="ge__case">
          <input type="checkbox" [ngModel]="comparer()" (ngModelChange)="comparer.set($event)" />
          Comparer à l'année précédente
        </label>
      }
    </div>

    <div class="ge" [style.height.px]="hauteur()">
      <div class="ge__legende" aria-hidden="true">
        <span><i class="ge__cle ge__cle--n"></i>{{ indicateur().libelle }}</span>
        @if (avecN1()) {
          <span><i class="ge__cle ge__cle--n1"></i>Année précédente</span>
        }
      </div>
      @if (tranches().length === 0) {
        <p class="ge__vide">Aucune donnée sur la période.</p>
      } @else {
        <svg [attr.width]="largeur()" [attr.height]="hauteurSvg()" role="img" [attr.aria-label]="indicateur().libelle">
          @for (g of geo().grille; track g.v) {
            <line [attr.x1]="geo().gauche" [attr.x2]="largeur() - 8" [attr.y1]="g.y" [attr.y2]="g.y"
                  class="ge__grille" [class.ge__zero]="g.v === 0" />
            <text [attr.x]="geo().gauche - 6" [attr.y]="g.y + 4" text-anchor="end" class="ge__axe">{{ g.libelle }}</text>
          }
          @if (forme() === 'colonnes') {
            @for (b of geo().barres; track $index) {
              <path [attr.d]="b.d" [class]="'ge__barre ge__barre--' + b.serie" />
            }
          } @else {
            @if (avecN1()) {
              <path [attr.d]="geo().ligneN1" class="ge__ligne ge__ligne--n1" />
            }
            <path [attr.d]="geo().ligneN" class="ge__ligne ge__ligne--n" />
            @if (survol() !== null) {
              <line [attr.x1]="geo().colonnes[survol()!].centre" [attr.x2]="geo().colonnes[survol()!].centre"
                    y1="0" [attr.y2]="geo().bas" class="ge__curseur" />
            }
            @for (c of geo().colonnes; track c.cle; let i = $index) {
              @if (avecN1() && c.yN1 !== null && (survol() === i || geo().colonnes.length <= 24)) {
                <circle [attr.cx]="c.centre" [attr.cy]="c.yN1" r="4" class="ge__point ge__point--n1" />
              }
              @if (c.yN !== null && (survol() === i || geo().colonnes.length <= 24)) {
                <circle [attr.cx]="c.centre" [attr.cy]="c.yN" r="4" class="ge__point ge__point--n" />
              }
            }
          }
          @for (c of geo().colonnes; track c.cle; let i = $index) {
            <text [attr.x]="c.centre" [attr.y]="hauteurSvg() - 6" text-anchor="middle" class="ge__axe">{{ c.etiquette }}</text>
            <rect [attr.x]="c.x" [attr.width]="c.largeur" y="0" [attr.height]="geo().bas"
                  class="ge__cible" (mouseenter)="survol.set(i)" (mouseleave)="survol.set(null)"
                  (focus)="survol.set(i)" (blur)="survol.set(null)" tabindex="0" [attr.aria-label]="c.aria" />
          }
        </svg>
        @if (survol() !== null && geo().colonnes[survol()!]; as c) {
          <div class="ge__bulle" [style.left.px]="c.centreBulle" role="status">
            <strong>{{ c.titre }}</strong>
            <span><i class="ge__cle ge__cle--n"></i>{{ c.valeur }}</span>
            @if (avecN1()) {
              <span><i class="ge__cle ge__cle--n1"></i>{{ c.valeurN1 }} un an plus tôt</span>
              @if (c.evolution) {
                <span class="ge__evol">{{ c.evolution }}</span>
              }
            }
          </div>
        }
      }
    </div>

    <details class="ge__table">
      <summary>Voir les valeurs</summary>
      <table>
        <thead>
          <tr>
            <th>Période</th><th>{{ indicateur().libelle }}</th>
            @if (avecN1()) {<th>Année précédente</th><th>Évolution</th>}
          </tr>
        </thead>
        <tbody>
          @for (c of geo().colonnes; track c.cle) {
            <tr>
              <td>{{ c.titre }}</td><td>{{ c.valeur }}</td>
              @if (avecN1()) {<td>{{ c.valeurN1 }}</td><td>{{ c.evolution || '—' }}</td>}
            </tr>
          }
        </tbody>
      </table>
    </details>
  `,
  styles: `
    :host { display: block; }
    .ge__outils { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem; margin-bottom: 0.75rem; }
    .ge__champ { display: flex; flex-direction: column; gap: 0.2rem; }
    .ge__champ span { font-size: var(--me-fs-xs); font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--me-text-muted); }
    .ge__champ select { height: 34px; padding: 0 0.6rem; border: 1px solid var(--me-border); border-radius: var(--me-radius); background: var(--me-bg-subtle); font: inherit; }
    .ge__case { display: inline-flex; align-items: center; gap: 0.4rem; height: 34px; font-size: var(--me-fs-md); color: var(--me-text-secondary); cursor: pointer; }
    .ge { position: relative; }
    .ge__legende { display: flex; gap: 1rem; justify-content: flex-end; font-size: var(--me-fs-sm); color: var(--me-text-secondary); }
    .ge__legende span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .ge__cle { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .ge__cle--n { background: #2a78d6; }
    .ge__cle--n1 { background: #eb6834; }
    .ge__vide { margin: 3rem 0; text-align: center; color: var(--me-text-muted); }
    svg { display: block; margin-top: 6px; overflow: visible; }
    .ge__grille { stroke: #ececee; stroke-width: 1; }
    .ge__zero { stroke: #c4c4c9; }
    .ge__axe { font-size: 11px; fill: var(--me-text-muted); font-variant-numeric: tabular-nums; }
    .ge__barre--n { fill: #2a78d6; }
    .ge__barre--n1 { fill: #eb6834; }
    .ge__ligne { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .ge__ligne--n { stroke: #2a78d6; }
    .ge__ligne--n1 { stroke: #eb6834; }
    .ge__point { stroke: var(--me-white); stroke-width: 2; }
    .ge__point--n { fill: #2a78d6; }
    .ge__point--n1 { fill: #eb6834; }
    .ge__curseur { stroke: #a1a1aa; stroke-width: 1; }
    .ge__cible { fill: transparent; outline: none; }
    .ge__cible:hover, .ge__cible:focus { fill: rgba(9, 9, 11, 0.035); }
    .ge__bulle {
      position: absolute; top: 24px; transform: translateX(-50%); pointer-events: none; z-index: 2;
      display: flex; flex-direction: column; gap: 0.2rem; min-width: 190px;
      padding: 0.55rem 0.7rem; border: 1px solid var(--me-border); border-radius: var(--me-radius);
      background: var(--me-white); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      font-size: var(--me-fs-sm); font-variant-numeric: tabular-nums; color: var(--me-text);
    }
    .ge__bulle span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .ge__evol { color: var(--me-text-muted); }
    .ge__table { margin-top: 0.5rem; font-size: var(--me-fs-sm); color: var(--me-text-muted); }
    .ge__table summary { cursor: pointer; }
    .ge__table table { width: 100%; margin-top: 0.5rem; border-collapse: collapse; font-variant-numeric: tabular-nums; color: var(--me-text); }
    .ge__table th, .ge__table td { padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--me-border); text-align: right; }
    .ge__table th:first-child, .ge__table td:first-child { text-align: left; }
  `,
})
export class GraphiqueEvolutionComponent implements OnDestroy {
  private readonly hote = inject(ElementRef<HTMLElement>);
  readonly periode = inject(AnalysePeriodeService);
  private observateur?: ResizeObserver;

  readonly tranches = input.required<TrancheBase[]>();
  readonly indicateurs = input.required<IndicateurSerie[]>();
  /** Découpage réellement appliqué par l'API (utile en automatique). */
  readonly granulariteServeur = input<string | null>(null);
  readonly hauteur = input(290);

  readonly granularites = GRANULARITES;
  readonly indicateurId = signal<string | null>(null);
  readonly forme = signal<Forme>('colonnes');
  readonly comparer = signal(true);
  readonly largeur = signal(640);
  readonly survol = signal<number | null>(null);

  readonly hauteurSvg = computed(() => this.hauteur() - 40);
  readonly indicateur = computed(
    () => this.indicateurs().find((i) => i.id === this.indicateurId()) ?? this.indicateurs()[0]
  );
  readonly avecN1 = computed(() => this.comparer() && !!this.indicateur().champN1);
  readonly granulariteEffective = computed(() => {
    const g = this.granulariteServeur();
    return g ? GRANULARITES.find((x) => x.id === g)?.libelle.replace('Par ', 'par ') ?? g : '';
  });

  readonly geo = computed(() => {
    const ind = this.indicateur();
    const n1 = this.avecN1();
    const pts = this.tranches().map((t) => {
      const r = t as unknown as Record<string, number | null>;
      return { t, v: r[ind.champ] ?? null, v1: ind.champN1 ? (r[ind.champN1] ?? null) : null };
    });
    const larg = this.largeur();
    const gauche = 56;
    const bas = this.hauteurSvg() - 22;
    const valeurs = pts.flatMap((p) => (n1 ? [p.v ?? 0, p.v1 ?? 0] : [p.v ?? 0]));
    const ticks = graduations(Math.min(0, ...valeurs), Math.max(0, ...valeurs, ind.unite === 'pct' ? 1 : 1));
    const vMin = ticks[0];
    const vMax = ticks[ticks.length - 1];
    const y = (v: number) => 6 + (bas - 6) * (1 - (v - vMin) / (vMax - vMin || 1));
    const y0 = y(0);
    const bande = (larg - gauche - 8) / Math.max(1, pts.length);
    const nbSeries = n1 ? 2 : 1;
    const lb = Math.max(2, Math.min(24, (bande * 0.72 - (nbSeries - 1) * 2) / nbSeries));
    const groupe = lb * nbSeries + (nbSeries - 1) * 2;
    const pasEtiquette = Math.ceil(pts.length / Math.max(1, Math.floor((larg - gauche) / 58)));

    const barres: { d: string; serie: 'n' | 'n1' }[] = [];
    const colonnes = pts.map((p, i) => {
      const x = gauche + i * bande;
      const d0 = x + (bande - groupe) / 2;
      if (p.v !== null) barres.push({ d: colonne(d0, lb, y0, y(p.v)), serie: 'n' });
      if (n1 && p.v1 !== null) barres.push({ d: colonne(d0 + lb + 2, lb, y0, y(p.v1)), serie: 'n1' });
      const evol = n1 && p.v !== null && p.v1 ? ((p.v - p.v1) / Math.abs(p.v1)) * 100 : null;
      const centre = x + bande / 2;
      return {
        cle: p.t.cle,
        x,
        largeur: bande,
        centre,
        centreBulle: Math.min(Math.max(centre, 100), larg - 100),
        yN: p.v === null ? null : y(p.v),
        yN1: p.v1 === null ? null : y(p.v1),
        etiquette: i % pasEtiquette === 0 ? p.t.libelle : '',
        titre: this.titreTranche(p.t),
        valeur: this.format(p.v, ind.unite),
        valeurN1: this.format(p.v1, ind.unite),
        evolution:
          evol === null
            ? ''
            : ind.unite === 'pct'
              ? `${p.v! - p.v1! > 0 ? '+' : ''}${NF1.format(p.v! - p.v1!)} pt sur un an`
              : `${evol > 0 ? '+' : ''}${NF1.format(evol)} % sur un an`,
        aria: `${this.titreTranche(p.t)} : ${this.format(p.v, ind.unite)}`,
      };
    });

    const ligne = (cle: 'yN' | 'yN1') => {
      let d = '';
      let ouvert = false;
      for (const c of colonnes) {
        const v = c[cle];
        if (v === null) {
          ouvert = false;
          continue;
        }
        d += `${ouvert ? 'L' : 'M'}${c.centre},${v} `;
        ouvert = true;
      }
      return d;
    };

    return {
      gauche,
      bas,
      barres: barres.filter((b) => b.d),
      colonnes,
      ligneN: ligne('yN'),
      ligneN1: ligne('yN1'),
      grille: ticks.map((v) => ({ v, y: y(v), libelle: ind.unite === 'pct' ? `${NF1.format(v)} %` : compact(v) })),
    };
  });

  constructor() {
    afterNextRender(() => {
      const el = this.hote.nativeElement as HTMLElement;
      this.largeur.set(Math.max(280, el.clientWidth));
      this.observateur = new ResizeObserver((e) => this.largeur.set(Math.max(280, e[0].contentRect.width)));
      this.observateur.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observateur?.disconnect();
  }

  private titreTranche(t: TrancheBase): string {
    const d = (s: string) => {
      const [a, m, j] = s.slice(0, 10).split('-');
      return `${j}/${m}/${a}`;
    };
    return t.debut.slice(0, 10) === t.fin.slice(0, 10) ? d(t.debut) : `${t.libelle} · ${d(t.debut)} – ${d(t.fin)}`;
  }

  private format(v: number | null, unite: IndicateurSerie['unite']): string {
    if (v === null || v === undefined) return '—';
    if (unite === 'pct') return `${NF1.format(v)} %`;
    if (unite === 'nb') return NF.format(v);
    return `${NF.format(v)} Ar`;
  }
}

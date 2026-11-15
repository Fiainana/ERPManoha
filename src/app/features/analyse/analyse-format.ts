import { Pipe, PipeTransform } from '@angular/core';

const NF0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Montant compact : 709,6 M · 2,2 M · 13 k · 850. */
export function compact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `${NF1.format(v / 1e9)} Md`;
  if (a >= 1e6) return `${NF1.format(v / 1e6)} M`;
  if (a >= 1e4) return `${NF0.format(v / 1e3)} k`;
  return NF0.format(v);
}

@Pipe({ name: 'compact' })
export class CompactPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return compact(v);
  }
}

/** Pourcentage, signé si demandé : +12,5 % · −3 % · —. */
@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(v: number | null | undefined, signe = false): string {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    const s = signe && v > 0 ? '+' : '';
    return `${s}${NF1.format(v).replace('-', '−')} %`;
  }
}

/** Nombre décimal à la française (virgule, 2 décimales au plus) ou « — ». */
@Pipe({ name: 'nb' })
export class NbPipe implements PipeTransform {
  private static readonly F = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  transform(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return NbPipe.F.format(v).replace('-', '−');
  }
}

/** Nombre de jours lisible. */
@Pipe({ name: 'jours' })
export class JoursPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return `${NF0.format(v)} j`;
  }
}

/** Classe CSS d'une variation : hausse = bonne nouvelle, sauf si `inverse` (ex. dettes, prix d'achat). */
export function sensDelta(v: number | null | undefined, inverse = false): string {
  if (v === null || v === undefined || Math.abs(v) < 0.05) return 'delta';
  const bon = inverse ? v < 0 : v > 0;
  return bon ? 'delta delta--up' : 'delta delta--down';
}

export const LIBELLES_STATUT_CLIENT: Record<string, string> = {
  Nouveau: 'Nouveau',
  Perdu: 'Perdu',
  EnHausse: 'En hausse',
  EnBaisse: 'En baisse',
  Stable: 'Stable',
  Inactif: 'Inactif',
};

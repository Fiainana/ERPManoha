import { RH_JOURS_SEMAINE, RH_STATUTS_ABSENCE, RhStatutAbsence } from '../../core/models/rh.model';

/** Couleur de badge (attribut data-tone de .badge). */
export type RhTon = 'ok' | 'warn' | 'danger' | 'info' | 'violet' | '';

export function tonAbsence(statut: string): RhTon {
  switch (statut) {
    case 'Validee':
      return 'ok';
    case 'EnAttenteRh':
      return 'warn';
    case 'EnAttenteResponsable':
      return 'info';
    case 'Refusee':
      return 'danger';
    default:
      return '';
  }
}

export function libelleStatutAbsence(statut: string): string {
  return RH_STATUTS_ABSENCE[statut as RhStatutAbsence] ?? statut;
}

export function tonPresence(statut: string): RhTon {
  switch (statut) {
    case 'Present':
      return 'ok';
    case 'Absent':
      return 'danger';
    case 'Absence':
      return 'info';
    case 'Repos':
    case 'Ferie':
      return 'violet';
    default:
      return '';
  }
}

export function libellePresence(statut: string): string {
  switch (statut) {
    case 'Present':
      return 'Présent';
    case 'Absent':
      return 'Absent (non justifié)';
    case 'Absence':
      return 'Absence justifiée';
    case 'Repos':
      return 'Repos';
    case 'Ferie':
      return 'Férié';
    case 'NonSuivi':
      return 'Non suivi';
    case 'AVenir':
      return 'Pas encore arrivé';
    default:
      return statut;
  }
}

export function libelleRepos(type: string | null): string {
  switch (type) {
    case 'Fixe':
      return 'repos fixe';
    case 'Planifie':
      return 'jour off';
    case 'Auto':
      return 'repos (rotation)';
    default:
      return '';
  }
}

/** [6, 7] → « Sam, Dim ». */
export function libelleJours(jours: number[] | null | undefined): string {
  if (!jours?.length) return '—';
  return jours
    .map((j) => RH_JOURS_SEMAINE.find((x) => x.iso === j)?.court ?? String(j))
    .join(', ');
}

/** « Fixe (Sam, Dim) » / « Rotation 5/7 ». */
export function libelleRegime(mode: string, joursRepos: number[] | null, joursTravailSemaine: number | null): string {
  if (mode === 'Rotation') return `Rotation ${joursTravailSemaine ?? 5}/7`;
  return joursRepos?.length ? `Fixe (${libelleJours(joursRepos)})` : 'Fixe (horaire)';
}

/** Dates API sans fuseau stockées en UTC. */
export function utc(d: string | null | undefined): string | null {
  if (!d) return null;
  return /[zZ]|[+-]\d\d:\d\d$/.test(d) ? d : d + 'Z';
}

/** Ouvre un fichier téléchargé (blob) dans un nouvel onglet. */
export function ouvrirBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Module Ressources humaines (/api/rh/*). Dates en yyyy-MM-dd, heures de pointage = heure murale. */

export interface RhPage<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
}

export type RhStatutEmploye = 'Actif' | 'Suspendu' | 'Sorti';
export type RhModeRepos = 'Fixe' | 'Rotation';

export interface RhEmployeListItem {
  id: number;
  matricule: string;
  nom: string;
  prenom: string | null;
  nomComplet: string;
  sexe: string | null;
  telephone: string | null;
  email: string | null;
  statut: RhStatutEmploye;
  dateEmbauche: string;
  dateSortie: string | null;
  pointeuseNo: string | null;
  departementId: number | null;
  departement: string | null;
  posteId: number | null;
  poste: string | null;
  modeRepos: RhModeRepos;
  joursRepos: number[] | null;
  joursTravailSemaine: number;
  contratType: string | null;
  contratFin: string | null;
}

export interface RhEmploye extends RhEmployeListItem {
  dateNaissance: string | null;
  lieuNaissance: string | null;
  cin: string | null;
  cinDate: string | null;
  cinLieu: string | null;
  cnaps: string | null;
  adresse: string | null;
  situationFamiliale: string | null;
  nbEnfants: number | null;
  contactUrgence: string | null;
  horaireId: number | null;
  horaire: string | null;
  motifSortie: string | null;
  pinDefini: boolean;
  pinBloqueJusqua: string | null;
  soldeCongesInitial: number;
  dateSoldeInitial: string | null;
  notes: string | null;
  creeLe: string;
  creePar: string | null;
  modifieLe: string | null;
  modifiePar: string | null;
}

/** Corps de POST / PUT /api/rh/employes. */
export interface RhEmployeRequest {
  matricule: string | null;
  nom: string;
  prenom: string | null;
  sexe: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  cin: string | null;
  cinDate: string | null;
  cinLieu: string | null;
  cnaps: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  situationFamiliale: string | null;
  nbEnfants: number | null;
  contactUrgence: string | null;
  departementId: number | null;
  posteId: number | null;
  horaireId: number | null;
  modeRepos: RhModeRepos;
  joursRepos: number[] | null;
  joursTravailSemaine: number;
  dateEmbauche: string | null;
  pointeuseNo: string | null;
  soldeCongesInitial: number;
  dateSoldeInitial: string | null;
  notes: string | null;
}

export interface RhSoldeConges {
  employeId: number;
  date: string;
  acquisDepuis: string;
  moisAcquis: number;
  joursParMois: number;
  soldeInitial: number;
  ajustements: number;
  acquis: number;
  pris: number;
  /** Congés validés qui n'ont pas encore commencé. */
  planifies: number;
  enAttente: number;
  solde: number;
  /** solde − planifies − enAttente */
  soldeApresDemandes: number;
}

export interface RhContrat {
  id: number;
  type: string;
  dateDebut: string;
  dateFin: string | null;
  enCours: boolean;
  joursRestants: number | null;
  salaireBase: number | null;
  posteId: number | null;
  poste: string | null;
  notes: string | null;
  creeLe: string;
  creePar: string | null;
}

export interface RhEmployeDetail {
  employe: RhEmploye;
  contrats: RhContrat[];
  soldeConges: RhSoldeConges;
}

export interface RhAjustement {
  id: number;
  dateEffet: string;
  jours: number;
  motif: string;
  creeLe: string;
  creePar: string | null;
}

// —— Absences ——

export type RhStatutAbsence = 'EnAttenteResponsable' | 'EnAttenteRh' | 'Validee' | 'Refusee' | 'Annulee';

export interface RhAbsence {
  id: number;
  employeId: number;
  matricule: string;
  nom: string;
  prenom: string | null;
  type: string;
  dateDebut: string;
  dateFin: string;
  debutApresMidi: boolean;
  finMatin: boolean;
  nbJours: number;
  motif: string | null;
  statut: RhStatutAbsence;
  demandeLe: string;
  demandePar: string | null;
  traiteLe: string | null;
  traitePar: string | null;
  commentaire: string | null;
  origine: 'Rh' | 'Employe';
  avisResponsable: boolean | null;
  avisPar: string | null;
  avisLe: string | null;
  avisCommentaire: string | null;
  departementId: number | null;
  departement: string | null;
  nbDocuments: number;
}

export interface RhHistorique {
  le: string;
  acteur: string | null;
  role: string;
  action: string;
  statutAvant: string | null;
  statutApres: string | null;
  commentaire: string | null;
}

export interface RhDocument {
  id: number;
  nomFichier: string;
  contentType: string;
  taille: number;
  deposeLe: string;
  deposePar: string | null;
}

export interface RhAlerteEffectif {
  date: string;
  absents: number;
  maximum: number;
  noms: string[];
}

export interface RhAbsenceDetail {
  absence: RhAbsence;
  historique: RhHistorique[];
  documents: RhDocument[];
  solde: RhSoldeConges | null;
  alertesEffectif: RhAlerteEffectif[];
}

export interface RhAbsenceCreation {
  absence: RhAbsence;
  solde: RhSoldeConges | null;
  depasseSolde: boolean;
  alertesEffectif: RhAlerteEffectif[];
}

export interface RhAbsenceRequest {
  employeId: number;
  type: string;
  dateDebut: string;
  dateFin: string;
  debutApresMidi: boolean;
  finMatin: boolean;
  motif: string | null;
  valider: boolean;
}

// —— Référentiels ——

export interface RhDepartement {
  id: number;
  nom: string;
  actif: boolean;
  responsableUserId: number | null;
  responsableLogin: string | null;
  responsable: string | null;
  emailNotification: string | null;
  nbEmployes: number;
}

export interface RhResponsablePossible {
  userId: number;
  login: string;
  nom: string | null;
  departements: string[] | string | null;
}

export interface RhPoste {
  id: number;
  intitule: string;
  departementId: number | null;
  departement: string | null;
  actif: boolean;
  nbEmployes: number;
}

export interface RhHoraire {
  id: number;
  nom: string;
  heureDebut: string;
  heureFin: string;
  pauseMinutes: number;
  joursTravailles: number[];
  toleranceRetardMin: number;
  dureeJournaliereMinutes: number;
  parDefaut: boolean;
  actif: boolean;
}

export interface RhJourFerie {
  date: string;
  jour: string;
  libelle: string;
}

// —— Planning ——

export type RhStatutJourPlanning = 'Travail' | 'Repos' | 'JourOff' | 'Absence' | 'Ferie' | 'HorsContrat';

export interface RhJourPlanning {
  date: string;
  statut: RhStatutJourPlanning;
  origine: 'Auto' | 'Manuel' | null;
  jourFerie: string | null;
  absence: { id: number; type: string; motif: string | null; demiJournee: 'Matin' | 'ApresMidi' | null } | null;
  demandeEnAttente: { id: number; type: string; statut: string; demiJournee: 'Matin' | 'ApresMidi' | null } | null;
}

export interface RhSemaineRotation {
  semaine: string;
  lundi: string;
  quota: number;
  planifies: number;
  aPlanifier: number;
}

export interface RhPlanningEmploye {
  employeId: number;
  matricule: string;
  nom: string;
  departementId: number | null;
  departement: string | null;
  modeRepos: RhModeRepos;
  joursRepos: number[] | null;
  joursTravailSemaine: number | null;
  semaines: RhSemaineRotation[] | null;
  jours: RhJourPlanning[];
}

export interface RhPlanning {
  debut: string;
  fin: string;
  joursSansOff: number[];
  jours: {
    date: string;
    jour: string;
    jourFerie: string | null;
    offBloque: boolean;
    auTravail: number;
    enRepos: number;
    absents: number;
  }[];
  employes: RhPlanningEmploye[];
}

export interface RhPlanifierRotationRequest {
  debut: string;
  fin: string;
  employeIds?: number[] | null;
  departementId?: number | null;
  joursExclus?: number[] | null;
  remplacer: boolean;
  simulation: boolean;
  motif?: string | null;
}

export interface RhPlanifierRotationResult {
  simulation: boolean;
  debut: string;
  fin: string;
  joursExclus: number[];
  supprimes: number;
  ajoutes: number;
  avertissements: string[];
  employes: {
    employeId: number;
    matricule: string;
    nom: string;
    departement: string | null;
    joursTravailSemaine: number;
    semaines: {
      semaine: string;
      lundi: string;
      quota: number;
      joursOff: { date: string; jour: string; origine: string; nouveau: boolean }[];
    }[];
  }[];
}

export interface RhJoursOffResult {
  ajoutes: number;
  avertissements: string[];
}

// —— Présence ——

export type RhStatutPresence = 'Present' | 'Absent' | 'Absence' | 'Repos' | 'Ferie' | 'NonSuivi' | 'AVenir';

export interface RhJourPresence {
  employeId: number;
  matricule: string;
  nom: string;
  date: string;
  statut: RhStatutPresence;
  reposType: string | null;
  typeAbsence: string | null;
  demiJourneeAbsence: boolean;
  jourFerie: string | null;
  horsHoraire: boolean;
  arrivee: string | null;
  depart: string | null;
  nbPointages: number;
  nbPointagesManuels: number;
  pointages: string[];
  retardMinutes: number;
  departAnticipeMinutes: number;
  minutesTravaillees: number;
  pauseMinutes: number | null;
  pauseDepasseeMinutes: number;
  sortieManquante: boolean;
}

export interface RhPresenceDuJour {
  date: string;
  total: number;
  presents: number;
  enRetard: number;
  absents: number;
  enAbsenceJustifiee: number;
  enRepos: number;
  pasEncoreArrives: number;
  nonSuivis: number;
  jourFerie: string | null;
  lignes: RhJourPresence[];
}

export interface RhSynthesePresence {
  employeId: number;
  matricule: string;
  nom: string;
  departement: string | null;
  pointeuseNo: string | null;
  suiviPointeuse: boolean;
  horaire: string | null;
  modeRepos: string;
  joursOuvres: number;
  joursPresent: number;
  joursHorsHoraire: number;
  joursRepos: number;
  joursAbsenceJustifiee: number;
  joursAbsenceNonJustifiee: number;
  nbRetards: number;
  minutesRetard: number;
  minutesPauseDepassee: number;
  minutesTravaillees: number;
  minutesPrevues: number;
  tauxPresence: number | null;
}

export interface RhRapportPresence {
  debut: string;
  fin: string;
  employes: RhSynthesePresence[];
  lignes: RhJourPresence[];
}

export interface RhJustifierRequest {
  employeId: number;
  date: string;
  dateFin: string | null;
  type: string;
  motif: string | null;
  debutApresMidi: boolean;
  finMatin: boolean;
}

// —— Tableau de bord ——

export interface RhTableauBord {
  date: string;
  effectifs: { actifs: number; suspendus: number; embauchesDuMois: number; sortiesDuMois: number };
  parDepartement: { departement: string; effectif: number }[];
  presenceDuJour: RhPresenceDuJour;
  absencesEnAttente: {
    nb: number;
    items: {
      id: number;
      employeId: number;
      nom: string;
      type: string;
      dateDebut: string;
      dateFin: string;
      nbJours: number;
      demandeLe: string;
      statut: RhStatutAbsence;
    }[];
  };
  absentsAujourdhui: { id: number; employeId: number; nom: string; type: string; dateDebut: string; dateFin: string }[];
  contratsAEcheance: {
    joursAlerte: number;
    items: {
      contratId: number;
      employeId: number;
      nom: string;
      type: string;
      dateDebut: string;
      dateFin: string;
      joursRestants: number;
      expire: boolean;
    }[];
  };
  employesSansContrat: { employeId: number; matricule: string; nom: string }[];
  fichesIncompletes: { employeId: number; matricule: string; nom: string; manquants: string[] }[];
  anomaliesVeille: {
    date: string;
    items: {
      employeId: number;
      nom: string;
      date: string;
      anomalie: 'SortieManquante' | 'AbsenceNonJustifiee';
      pointages: string[];
    }[];
  };
  pointeuse: {
    synchro: {
      appareil: string;
      derniereTentative: string;
      dernierSucces: string | null;
      dernierStatut: string | null;
      enErreur: boolean;
    } | null;
    personnesSansFiche: { pointeuseNo: string; nom: string | null; dernierPointage: string | null }[];
  };
}

// —— Pointeuse ——

export interface RhPointage {
  id: number;
  serialNo: number | null;
  employeNo: string;
  nom: string | null;
  datePointage: string;
  datePointageUtc: string | null;
  statut: string | null;
  modeVerification: string | null;
  appareil: string | null;
  source: 'Pointeuse' | 'Manuel';
  motif: string | null;
  saisiPar: string | null;
  ignore: boolean;
  ignoreMotif: string | null;
  ignorePar: string | null;
}

export interface RhPersonnePointeuse {
  employeNo: string;
  nom: string | null;
  actif: boolean;
  premierPointage: string | null;
  dernierPointage: string | null;
  rhEmployeId: number | null;
  rhMatricule: string | null;
}

export interface RhStatutPointeuse {
  configure: boolean;
  actif: boolean;
  url: string | null;
  heures: number[];
  appareils: {
    appareil: string;
    derniereTentative: string | null;
    dernierSucces: string | null;
    dernierStatut: string | null;
    nbImportes: number;
    nbTotal: number;
    dernierPointage: string | null;
    dernierSerialNo: number | null;
  }[];
}

// —— Libellés UI ——

export const RH_JOURS_SEMAINE = [
  { iso: 1, court: 'Lun', long: 'Lundi' },
  { iso: 2, court: 'Mar', long: 'Mardi' },
  { iso: 3, court: 'Mer', long: 'Mercredi' },
  { iso: 4, court: 'Jeu', long: 'Jeudi' },
  { iso: 5, court: 'Ven', long: 'Vendredi' },
  { iso: 6, court: 'Sam', long: 'Samedi' },
  { iso: 7, court: 'Dim', long: 'Dimanche' },
] as const;

export const RH_TYPES_ABSENCE = [
  { value: 'Conge', label: 'Congé' },
  { value: 'Permission', label: 'Permission' },
  { value: 'Maladie', label: 'Maladie' },
  { value: 'SansSolde', label: 'Sans solde' },
  { value: 'Mission', label: 'Mission' },
  { value: 'Formation', label: 'Formation' },
] as const;

export const RH_TYPES_CONTRAT = ['CDI', 'CDD', 'Essai', 'Stage', 'Prestataire'] as const;

export const RH_STATUTS_ABSENCE: Record<RhStatutAbsence, string> = {
  EnAttenteResponsable: 'Avis responsable',
  EnAttenteRh: 'À valider (RH)',
  Validee: 'Validée',
  Refusee: 'Refusée',
  Annulee: 'Annulée',
};

export function rhLibelleTypeAbsence(type: string | null | undefined): string {
  return RH_TYPES_ABSENCE.find((t) => t.value === type)?.label ?? type ?? '';
}

/** Durée en minutes → « 7 h 05 ». */
export function rhDuree(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const m = Math.round(Math.abs(minutes));
  const h = Math.floor(m / 60);
  return `${minutes < 0 ? '-' : ''}${h} h ${String(m % 60).padStart(2, '0')}`;
}

/** Date locale → yyyy-MM-dd. */
export function rhIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** yyyy-MM-dd + n jours. */
export function rhAjouterJours(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return rhIso(new Date(y, m - 1, d + n));
}

/** Lundi de la semaine de la date (yyyy-MM-dd). */
export function rhLundi(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const iso1 = date.getDay() === 0 ? 7 : date.getDay();
  return rhAjouterJours(iso, 1 - iso1);
}

/** yyyy-MM-dd → jour ISO (1 = lundi … 7 = dimanche). */
export function rhJourIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const j = new Date(y, m - 1, d).getDay();
  return j === 0 ? 7 : j;
}

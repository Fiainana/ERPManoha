/** Clôture de caisse journalière (api/caisse/clotures). */

export type StatutCloture = 'Cloturee' | 'Rouverte' | 'Versee' | 'NonCloturee';

export interface ReglementJour {
  rgNo: number;
  heure: string | null;
  montant: number;
  modeIndex: number;
  mode: string;
  especes: boolean;
  journal: string | null;
  journalIntitule: string | null;
  clientNumero: string | null;
  client: string | null;
  libelle: string | null;
  pieces: string | null;
  /** Règlement d'une facture d'un jour précédent. */
  factureAnterieure: boolean;
}

export interface EtatJour {
  jour: string;
  nbReglements: number;
  totalEncaisse: number;
  especesAttendues: number;
  encaissementsFacturesAnterieures: number;
  parMode: { modeIndex: number; mode: string; especes: boolean; nb: number; total: number }[];
  parJournal: { journal: string; intitule: string | null; nb: number; total: number }[];
  ventes: { nbFactures: number; totalTtc: number; regle: number; reste: number; nbRetours: number; totalRetours: number };
  reglements: ReglementJour[];
}

export interface ClotureDetail {
  id: number;
  jour: string;
  code: string;
  statut: Exclude<StatutCloture, 'NonCloturee'>;
  nbReglements: number;
  totalEncaisse: number;
  especesAttendues: number;
  especesComptees: number;
  montantPieces: number;
  ecart: number;
  motifEcart: string | null;
  commentaire: string | null;
  montantAVerser: number;
  controles: { modeIndex: number; mode: string; nbAttendu: number; nbCompte: number; total: number }[];
  billetage: { coupure: number; nombre: number; montant: number }[];
  cloturePar: string | null;
  clotureLe: string;
  versement: {
    journal: string;
    banque: string;
    date: string;
    montant: number;
    bordereau: string;
    note: string | null;
    par: string | null;
    le: string;
    ecart: number;
  } | null;
  historique: { le: string; par: string | null; action: string; detail: string | null }[];
}

export interface JourCaisse {
  jour: string;
  estAujourdhui: boolean;
  etat: EtatJour;
  cloture: ClotureDetail | null;
  /** Règlements ajoutés, retirés ou modifiés dans Sage depuis la clôture. */
  ecartsSage: {
    ajoutes: ReglementJour[];
    retires: ReglementJour[];
    modifies: ReglementJour[];
    totalActuel: number;
    especesActuelles: number;
    difference: number;
    differenceEspeces: number;
  } | null;
  coupures: number[];
  banques: { journal: string; intitule: string | null }[];
}

export interface CloturerRequest {
  jour: string;
  billets: { coupure: number; nombre: number }[];
  montantPieces: number;
  controles: { modeIndex: number; nombreCompte: number }[];
  motifEcart: string | null;
  commentaire: string | null;
}

export interface VersementRequest {
  journal: string;
  date: string;
  montant: number;
  bordereau: string;
  note: string | null;
}

export interface ClotureListeItem {
  jour: string;
  code: string | null;
  statut: StatutCloture;
  nbReglements: number;
  totalEncaisse: number;
  especesAttendues: number;
  especesComptees: number | null;
  ecart: number | null;
  motifEcart: string | null;
  montantAVerser: number | null;
  versementMontant: number | null;
  versementBanque: string | null;
  versementDate: string | null;
  versementBordereau: string | null;
  ecartVersement: number | null;
  cloturePar: string | null;
  clotureLe: string | null;
  modifieDansSage: boolean;
}

export interface ClotureListe {
  debut: string;
  fin: string;
  resume: {
    nbClotures: number;
    nbNonCloturees: number;
    nbAVerser: number;
    montantAVerser: number;
    nbVersees: number;
    totalEncaisse: number;
    totalEcarts: number;
    nbEcarts: number;
  };
  items: ClotureListeItem[];
}

export const LIBELLES_STATUT_CLOTURE: Record<StatutCloture, { libelle: string; ton: string }> = {
  NonCloturee: { libelle: 'Non clôturée', ton: 'danger' },
  Rouverte: { libelle: 'Rouverte', ton: 'warn' },
  Cloturee: { libelle: 'À verser', ton: 'info' },
  Versee: { libelle: 'Versée', ton: 'ok' },
};

/** Suivi GPS des commerciaux — API /api/admin/presence (dates en UTC ISO). */

export interface PositionCommercial {
  userId: number;
  login: string;
  libelle: string;
  roles: string | null;
  sessionId: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Dernier signal reçu (heure serveur, UTC). */
  derniereActivite: string | null;
  sessionTerminee: boolean;
  plateforme: string | null;
  versionApp: string | null;
  enLigne: boolean;
  sessionsJour: number;
  dureeJourSecondes: number;
  devisJour: number;
}

export interface PositionsLive {
  minutesEnLigne: number;
  items: PositionCommercial[];
}

export interface PointTrajet {
  sessionId: string;
  evenement: 'start' | 'heartbeat' | 'end' | string;
  latitude: number;
  longitude: number;
  precision: number | null;
  le: string;
}

export interface SessionTrajet {
  sessionId: string;
  debut: string;
  fin: string;
  dureeSecondes: number;
  nbPoints: number;
  terminee: boolean;
  distanceMetres: number;
}

export interface DevisGeolocalise {
  numeroPiece: string;
  latitude: number;
  longitude: number;
  creeLe: string;
  clientNumero: string | null;
  clientIntitule: string | null;
  totalTTC: number | null;
  /** Facture issue du devis (le devis n'existe alors plus dans Sage). */
  pieceTransformee: string | null;
}

/** Rapport d'activité — une ligne par commercial et par jour local. */
export interface ActiviteJour {
  userId: number;
  login: string;
  libelle: string;
  /** Jour local, yyyy-MM-dd. */
  jour: string;
  premiereActivite: string | null;
  derniereActivite: string | null;
  sessions: number;
  dureeSecondes: number;
  distanceMetres: number;
  nbPoints: number;
  devis: number;
  montantDevisTtc: number;
  devisFactures: number;
  montantFactureTtc: number;
}

/** Synthèse de la période pour un commercial (présent même sans activité). */
export interface ActiviteCommercial {
  userId: number;
  login: string;
  libelle: string;
  joursActifs: number;
  sessions: number;
  dureeSecondes: number;
  distanceMetres: number;
  devis: number;
  montantDevisTtc: number;
  devisFactures: number;
  montantFactureTtc: number;
  premiereActivite: string | null;
  derniereActivite: string | null;
}

export interface RapportActivite {
  debutUtc: string;
  finUtc: string;
  lignes: ActiviteJour[];
  commerciaux: ActiviteCommercial[];
}

export interface JourneeCommercial {
  utilisateur: { userId: number; login: string; libelle: string };
  debutUtc: string;
  finUtc: string;
  dureeSecondes: number;
  distanceMetres: number;
  sessions: SessionTrajet[];
  points: PointTrajet[];
  devis: DevisGeolocalise[];
}

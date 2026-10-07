/** Inventaire partiel — API /api/inventaires */

export type InventaireStatut = 'Brouillon' | 'Soumis' | 'Valide' | 'Annule';

export interface InventaireListItem {
  id: number;
  depotNo: number;
  depotIntitule: string | null;
  statut: InventaireStatut;
  origine: 'Auto' | 'Manuel' | string;
  semaine: string | null;
  note: string | null;
  dateCreation: string | null;
  dateSoumission: string | null;
  dateValidation: string | null;
  nbLignes: number;
  nbComptees: number;
}

export interface InventaireListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: InventaireListItem[];
}

export interface InventaireEntete {
  id: number;
  depotNo: number;
  depotIntitule: string | null;
  statut: InventaireStatut;
  origine: string;
  semaine: string | null;
  note: string | null;
  pieceSageEntree: string | null;
  pieceSageSortie: string | null;
  dateCreation: string | null;
  dateSoumission: string | null;
  dateValidation: string | null;
}

export interface InventaireLigne {
  id: number;
  articleReference: string;
  designation: string | null;
  motif: string | null;
  /** null en comptage à l'aveugle (rôle Depot) */
  qteTheorique: number | null;
  qteComptee: number | null;
  /** null en comptage à l'aveugle (rôle Depot) */
  ecart: number | null;
  dateComptage: string | null;
  ignoree: boolean;
  /** Saisie UI */
  saisie?: number | null;
  /** Choix admin à la validation */
  aIgnorer?: boolean;
}

export interface InventaireDetail {
  entete: InventaireEntete;
  lignes: InventaireLigne[];
  nbLignes: number;
  nbComptees: number;
  nbEcarts: number | null;
  comptageAveugle: boolean;
}

export interface InventaireValidationResult {
  ecartsPositifs: number;
  ecartsNegatifs: number;
  lignesIgnorees: number;
  pieceSageEntree: string | null;
  pieceSageSortie: string | null;
  message: string | null;
}

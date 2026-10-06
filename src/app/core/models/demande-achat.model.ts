/** Demandes d'achat métier (hors Sage tant que non transformées en BC) */

export type DemandeAchatStatut =
  | 'Envoyee'
  | 'EnAttenteArticle'
  | 'ArticlePret'
  | 'CommandeSageCreee'
  | 'Receptionnee'
  | 'Facturable'
  | 'Cloturee'
  | 'Annulee'
  | string;

export interface DemandeAchatListItem {
  id: number;
  statut: DemandeAchatStatut;
  statutLibelle: string | null;
  fournisseurCode: string | null;
  depotNo: number | null;
  depotIntitule: string | null;
  pieceSage: string | null;
  note: string | null;
  dateCreation: string | null;
  dateMaj: string | null;
  nbLignes: number;
  demandeurLibelle: string | null;
}

export interface DemandeAchatLigne {
  id: number;
  demandeId: number;
  refFournisseur: string | null;
  designation: string | null;
  quantite: number;
  articleSage: string | null;
  articleReference: string | null;
  qteRecue: number | null;
  estNouvelArticle: boolean;
}

export interface DemandeAchatDetail {
  id: number;
  statut: DemandeAchatStatut;
  statutLibelle: string | null;
  fournisseurCode: string | null;
  depotNo: number | null;
  depotIntitule: string | null;
  pieceSage: string | null;
  note: string | null;
  dateCreation: string | null;
  dateMaj: string | null;
  demandeurLibelle: string | null;
  lignes: DemandeAchatLigne[];
}

export interface DemandeAchatListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: DemandeAchatListItem[];
}

export interface CreateDemandeAchatLigne {
  articleReference?: string | null;
  designation?: string | null;
  quantite: number;
}

export interface CreateDemandeAchatPayload {
  note?: string | null;
  lignes: CreateDemandeAchatLigne[];
}

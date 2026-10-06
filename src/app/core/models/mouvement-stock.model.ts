/** Historique mouvements de stock — API /api/depot/mouvements-stock */

export interface MouvementStock {
  dateMouvement: string | null;
  domaine: number | null;
  typeDocument: number | null;
  typeLibelle: string | null;
  numeroPiece: string;
  tiers: string | null;
  referenceDoc: string | null;
  depotNo: number | null;
  depotIntitule: string | null;
  numeroLigne: number | null;
  articleReference: string | null;
  designation: string | null;
  quantite: number | null;
  quantiteMouvement: number | null;
  /** Entrée | Sortie | Mouvement */
  sens: string | null;
}

export interface MouvementStockListParams {
  article?: string;
  depotNo?: number;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface MouvementStockListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: MouvementStock[];
}

export interface DepotOption {
  no: number;
  intitule: string;
}

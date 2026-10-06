/** Documents d'achat fournisseur (BC / BL) — API /api/depot/achats */

export interface BcAchatEntete {
  numeroPiece: string;
  typeDocument: number | null;
  typeLibelle: string | null;
  dateDocument: string | null;
  fournisseurCode: string | null;
  fournisseurIntitule: string | null;
  totalHT: number | null;
  totalTTC: number | null;
  reference: string | null;
  depotNo: number | null;
  depotIntitule: string | null;
  statut: number | null;
}

export interface BcAchatLigne {
  numeroLigne: number;
  articleReference: string | null;
  designation: string | null;
  quantite: number | null;
  quantiteLivree: number | null;
  quantiteResteARecevoir: number | null;
  prixUnitaire: number | null;
  montantHT: number | null;
  montantTTC: number | null;
  remisePourcent: number | null;
  /** Saisie UI — qté à réceptionner (partielle) */
  quantiteARecevoir?: number;
}

export interface BcAchatReste {
  totalQuantiteReste: number;
  completementLivre: boolean;
  message: string | null;
}

export interface BcAchatDetail {
  entete: BcAchatEntete;
  lignes: BcAchatLigne[];
  resteARecevoir: BcAchatReste | null;
}

export interface BcAchatListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface BcAchatListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: BcAchatEntete[];
}

export interface ReceptionnerLignePayload {
  numeroLigne?: number | null;
  articleReference?: string | null;
  quantiteRecue: number;
}

export interface ReceptionnerPayload {
  lignes?: ReceptionnerLignePayload[];
}

export interface ReceptionResult {
  numeroPieceBc: string;
  numeroPieceReception: string | null;
  numerosPiecesReception: string[];
  receptionPartielle: boolean;
  message: string | null;
}

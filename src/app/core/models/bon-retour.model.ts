export interface BonRetourLigne {
  articleReference?: string | null;
  designation?: string | null;
  quantite?: number | null;
  prixUnitaire?: number | null;
  remisePourcent?: number | null;
  montantHT?: number | null;
  montantTTC?: number | null;
}

export interface BonRetourEntete {
  numeroPiece: string;
  dateDocument?: string | null;
  reference?: string | null;
  clientNumero?: string | null;
  clientIntitule?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  representant?: string | null;
  /** Facture d'origine si connue */
  factureOrigine?: string | null;
}

export interface BonRetourDetail {
  entete: BonRetourEntete;
  lignes: BonRetourLigne[];
}

export interface BonRetourListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: BonRetourEntete[];
}

export interface BonRetourListParams {
  search?: string;
  aujourdhui?: boolean;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  pageSize?: number;
}

export interface FactureLigne {
  articleReference?: string | null;
  reference?: string | null;
  designation?: string | null;
  quantite?: number | null;
  prixUnitaire?: number | null;
  remise?: number | null;
  remisePourcent?: number | null;
  montantHT?: number | null;
  montantTTC?: number | null;
}

export interface FactureEntete {
  numeroPiece: string;
  dateDocument?: string | null;
  reference?: string | null;
  clientNumero?: string | null;
  clientIntitule?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  netAPayer?: number | null;
  montantRegle?: number | null;
  resteAPayer?: number | null;
  representant?: string | null;
  /** true si déjà imprimée (commercial = 1 seule impression) */
  dejaImprimee?: boolean;
}

export interface FactureDetail {
  entete: FactureEntete;
  lignes: FactureLigne[];
}

export interface FactureListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: FactureEntete[];
}

export interface FactureListParams {
  search?: string;
  client?: string;
  aujourdhui?: boolean;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  pageSize?: number;
  mes?: boolean;
  impayees?: boolean;
}

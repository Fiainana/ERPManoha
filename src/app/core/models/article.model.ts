export interface Article {
  reference: string;
  designation?: string | null;
  codeFamille?: string | null;
  uniteVenteNo?: number | null;
  uniteVenteLibelle?: string | null;
  prixVente?: number | null;
  prixAchat?: number | null;
  sommeil?: boolean;
  stockTotal?: number | null;
  stockReserve?: number | null;
  stockCommande?: number | null;
  stockDisponible?: number | null;
}

export interface ArticleStockDepot {
  depotNo: number;
  depotIntitule?: string | null;
  stock?: number | null;
  reserve?: number | null;
  commande?: number | null;
  disponible?: number | null;
  principal?: boolean;
}

export interface ArticleListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  depotNo?: number | null;
  items: Article[];
}

export interface ArticleDetailResult {
  article: Article;
  stockTotal?: number | null;
  stockReserve?: number | null;
  stockCommande?: number | null;
  stockDisponible?: number | null;
  stocksParDepot?: ArticleStockDepot[];
}

export interface ArticleListParams {
  search?: string;
  depotNo?: number;
  page?: number;
  pageSize?: number;
  inclureSommeil?: boolean;
}

export interface DevisLigne {
  numeroLigne?: number | null;
  articleReference: string;
  designation?: string | null;
  quantite: number;
  prixUnitaire?: number | null;
  remisePourcent?: number | null;
  montantHT?: number | null;
  montantTTC?: number | null;
}

export interface DevisEntete {
  numeroPiece: string;
  dateDocument?: string | null;
  reference?: string | null;
  clientNumero?: string | null;
  clientIntitule?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  netAPayer?: number | null;
  representant?: string | null;
  statut?: number | null;
  souche?: string | null;
}

export interface DevisDetail {
  entete: DevisEntete;
  lignes: DevisLigne[];
}

export interface DevisListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: DevisEntete[];
}

export interface DevisLignePayload {
  articleReference: string;
  quantite: number;
  prixUnitaire?: number | null;
  remise?: number | null;
}

export interface CreateDevisRequest {
  clientNumero: string;
  reference?: string | null;
  date?: string | null;
  souche?: string | null;
  lignes: DevisLignePayload[];
}

export interface UpdateDevisRequest {
  reference?: string | null;
  date?: string | null;
  lignes?: DevisLignePayload[];
}

export interface EnvoyerDevisEmailRequest {
  to?: string[];
  cc?: string[];
  message?: string | null;
}

export interface DevisListParams {
  search?: string;
  client?: string;
  page?: number;
  pageSize?: number;
  /** true = uniquement mes devis (défaut API pour non-admin) */
  mes?: boolean;
}

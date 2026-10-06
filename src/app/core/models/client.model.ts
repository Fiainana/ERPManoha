export interface ClientCredit {
  encours: number;
  aCredit: boolean;
  sommeil: boolean;
  peutFacturerSansAdmin: boolean;
}

export interface Client {
  numero: string;
  intitule: string;
  adresse?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  telecopie?: string | null;
  email?: string | null;
  siret?: string | null;
  identifiant?: string | null;
  qualite?: string | null;
  classement?: string | null;
  sommeil?: boolean;
  encours?: number;
  aCredit?: boolean;
  modeReglementLibelle?: string | null;
  conditionReglementLibelle?: string | null;
  representant?: string | null;
  credit?: ClientCredit;
}

export interface ClientStats {
  nbDevis: number;
  nbFactures: number;
  caTtcFacture: number;
  resteAPayer: number;
  nbImpayees: number;
}

export interface ClientListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Client[];
}

/** Ligne devis rattachée à un client (API GET .../clients/{n}/devis). */
export interface DevisClient {
  numeroPiece: string;
  dateDocument?: string | null;
  reference?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  netAPayer?: number | null;
  representant?: string | null;
}

export interface DevisClientListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: DevisClient[];
}

/** Ligne facture rattachée à un client (API GET .../clients/{n}/factures). */
export interface FactureClient {
  numeroPiece: string;
  dateDocument?: string | null;
  reference?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  netAPayer?: number | null;
  montantRegle?: number | null;
  resteAPayer?: number | null;
}

export interface FactureClientListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  impayeesSeulement?: boolean;
  items: FactureClient[];
}

export interface ClientDetailResult {
  client: Client;
  stats?: ClientStats;
  derniereFactures?: FactureClientListResult;
  derniersDevis?: DevisClientListResult;
}

export interface ClientListParams {
  search?: string;
  ville?: string;
  codePostal?: string;
  page?: number;
  pageSize?: number;
  inclureSommeil?: boolean;
}

export interface CreateClientRequest {
  numero?: string | null;
  intitule: string;
  adresse?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  telecopie?: string | null;
  email?: string | null;
  siret?: string | null;
  identifiant?: string | null;
  representantCode?: string | null;
}

export interface UpdateClientRequest {
  intitule?: string | null;
  adresse?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  telecopie?: string | null;
  email?: string | null;
  siret?: string | null;
  identifiant?: string | null;
  representantCode?: string | null;
  sommeil?: boolean | null;
}

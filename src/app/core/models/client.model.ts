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

export interface ClientDetailResult {
  client: Client;
  stats?: ClientStats;
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

/** Fournisseurs Sage (CT_Type = 1) — API /api/admin/fournisseurs */

export interface Fournisseur {
  numero: string;
  intitule: string | null;
  adresse: string | null;
  complement: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  telecopie: string | null;
  email: string | null;
  siret: string | null;
  identifiant: string | null;
  sommeil: boolean;
  encours: number | null;
}

export interface FournisseurListParams {
  search?: string;
  ville?: string;
  page?: number;
  pageSize?: number;
  inclureSommeil?: boolean;
}

export interface FournisseurListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Fournisseur[];
}

export interface CreateFournisseurPayload {
  numero?: string | null;
  intitule: string;
  telephone?: string | null;
  telecopie?: string | null;
  email?: string | null;
  siret?: string | null;
  identifiant?: string | null;
  adresse?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
}

export interface UpdateFournisseurPayload {
  intitule?: string | null;
  telephone?: string | null;
  telecopie?: string | null;
  email?: string | null;
  siret?: string | null;
  identifiant?: string | null;
  adresse?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string | null;
  sommeil?: boolean | null;
}

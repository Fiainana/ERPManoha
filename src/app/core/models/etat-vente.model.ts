/** État de vente admin — POST /api/admin/factures/etat-vente/{scope} */

export type EtatVenteScope = 'comptoir' | 'b2b';

export interface EtatVenteItem {
  numeroPiece: string;
  dateDocument?: string | null;
  clientNumero?: string | null;
  clientIntitule?: string | null;
  nomClient?: string | null;
  numClient?: string | null;
  clientAffiche?: string | null;
  telephone?: string | null;
  representant?: string | null;
  reference?: string | null;
  totalHT?: number | null;
  totalTTC?: number | null;
  montantRegle?: number | null;
  resteAPayer?: number | null;
}

export interface EtatVenteResult {
  scope: EtatVenteScope | string;
  titre: string;
  date: string;
  clientComptoir?: string | null;
  count: number;
  totalHT: number;
  totalTTC: number;
  totalRegle: number;
  totalReste: number;
  items: EtatVenteItem[];
}

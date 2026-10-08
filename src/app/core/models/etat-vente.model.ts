/** État de vente admin — POST /api/admin/factures/etat-vente/{scope} */

export type EtatVenteScope = 'comptoir' | 'b2b' | 'tous';

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
  date?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  clientComptoir?: string | null;
  count: number;
  totalHT: number;
  totalTTC: number;
  totalRegle: number;
  totalReste: number;
  items: EtatVenteItem[];
}

export interface JournalCaisseItem {
  numero?: string | null;
  dateReglement?: string | null;
  montant: number;
  libelle?: string | null;
  clientNumero?: string | null;
  clientIntitule?: string | null;
  codeJournal?: string | null;
  journalIntitule?: string | null;
  modeIndex?: string | null;
  modeIntitule?: string | null;
}

export interface JournalCaisseAgg {
  mode?: string;
  journal?: string;
  count: number;
  total: number;
}

export interface JournalCaisseResult {
  date: string;
  comptoirUniquement: boolean;
  clientComptoir?: string | null;
  count: number;
  totalEncaissements: number;
  parMode: JournalCaisseAgg[];
  parJournal: JournalCaisseAgg[];
  items: JournalCaisseItem[];
}

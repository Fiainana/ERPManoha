/** Documents d'achat Sage — API /api/admin/achats (voir AGENTS.md § 5.5). */

export type TypeAchat = 'demandes' | 'preparations' | 'commandes' | 'receptions' | 'factures';

export const TYPES_ACHAT: { id: TypeAchat; libelle: string; singulier: string; pluriel: string }[] = [
  { id: 'demandes', libelle: 'Demandes d’achat', singulier: 'Demande d’achat', pluriel: 'demandes d’achat' },
  { id: 'preparations', libelle: 'Préparations', singulier: 'Préparation de commande', pluriel: 'préparations' },
  { id: 'commandes', libelle: 'Bons de commande', singulier: 'Bon de commande', pluriel: 'bons de commande' },
  { id: 'receptions', libelle: 'Bons de livraison', singulier: 'Bon de livraison', pluriel: 'bons de livraison' },
  { id: 'factures', libelle: 'Factures', singulier: 'Facture fournisseur', pluriel: 'factures' },
];

/** DO_Type Sage → type de route (pour les liens entre documents). */
export function typeAchatDepuisDoType(doType: number): TypeAchat | null {
  switch (doType) {
    case 10:
      return 'demandes';
    case 11:
      return 'preparations';
    case 12:
      return 'commandes';
    case 13:
      return 'receptions';
    case 16:
    case 17:
      return 'factures';
    default:
      return null;
  }
}

export interface AchatEntete {
  numeroPiece: string;
  typeDocument: number;
  typeLibelle: string;
  dateDocument: string | null;
  dateLivraison: string | null;
  fournisseurCode: string | null;
  fournisseurIntitule: string | null;
  reference: string | null;
  numeroFactureFournisseur: string | null;
  depotNo: number | null;
  depotIntitule: string | null;
  statut: number | null;
  statutLibelle: string | null;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  netAPayer: number;
  montantRegle: number | null;
  resteAPayer: number | null;
  comptabilisee: boolean;
  nbLignes: number;
  quantiteTotale: number;
}

export interface AchatLigne {
  numeroLigne: number;
  articleReference: string | null;
  referenceFournisseur: string | null;
  designation: string | null;
  unite: string | null;
  quantite: number;
  quantiteLivree: number;
  quantiteResteARecevoir: number | null;
  prixUnitaire: number;
  remisePourcent: number;
  montantHT: number;
  montantTTC: number;
  depotNo: number | null;
  pieceDemande: string | null;
  piecePreparation: string | null;
  pieceCommande: string | null;
  pieceLivraison: string | null;
}

export interface AchatLie {
  numeroPiece: string;
  typeDocument: number;
  typeLibelle: string;
  dateDocument: string | null;
}

export interface StatutAchat {
  code: number;
  libelle: string;
}

export interface AchatDetail {
  entete: AchatEntete;
  lignes: AchatLigne[];
  statutsPossibles: StatutAchat[];
  resteARecevoir: { totalQuantiteReste: number; completementLivre: boolean; message: string } | null;
  origines: AchatLie[];
  suites: AchatLie[];
}

export interface AchatResume {
  nb: number;
  totalHT: number;
  totalTTC: number;
  resteAPayer: number | null;
  nbFournisseurs: number;
}

export interface AchatListe {
  type: TypeAchat;
  resume: AchatResume;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: AchatEntete[];
}

export interface AchatListeParams {
  search?: string;
  fournisseur?: string;
  dateDebut?: string;
  dateFin?: string;
  nonReglees?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreerDemandeLigne {
  articleReference: string;
  quantite: number;
  prixUnitaire?: number | null;
  designation?: string | null;
}

export interface CreerDemandePayload {
  fournisseurCode: string;
  depotNo?: number | null;
  date?: string | null;
  dateLivraison?: string | null;
  reference?: string | null;
  statut?: number | null;
  lignes: CreerDemandeLigne[];
}

export interface CommanderPayload {
  date?: string | null;
  statutCommande?: number | null;
  lignes?: { numeroLigne: number }[];
}

export interface CommanderResultat {
  numeroPieceOrigine: string;
  numeroPieceCommande: string | null;
  partielle: boolean;
  origineSoldee: boolean;
  message: string;
  avertissement: string | null;
}

export interface FacturerPayload {
  pieces?: string[];
  date?: string | null;
  numeroFactureFournisseur?: string | null;
  reference?: string | null;
}

export interface FacturerResultat {
  numeroPieceFacture: string | null;
  message: string;
  avertissement: string | null;
}

export interface AchatEcheance {
  numeroEcheance: number;
  date: string | null;
  montant: number;
  montantRegle: number;
  resteAPayer: number;
  reglee: boolean;
  modeReglementNo: number | null;
  modeReglement: string | null;
}

export interface AchatReglement {
  numeroReglement: number;
  date: string | null;
  reference: string | null;
  libelle: string | null;
  montantReglement: number;
  montantImputeSurFacture: number;
  modeReglement: string | null;
  codeJournal: string | null;
}

export interface AchatEtatReglement {
  numeroPiece: string;
  netAPayer: number;
  montantRegle: number;
  resteAPayer: number;
  echeances: AchatEcheance[];
  reglements: AchatReglement[];
  modesReglement: { no: number; intitule: string }[];
  journaux: { code: string; intitule: string | null }[];
}

export interface ReglerPayload {
  montant?: number | null;
  date?: string | null;
  modeReglement?: string | null;
  codeJournal?: string | null;
  libelle?: string | null;
  reference?: string | null;
}

/** Référentiel de création d'article (familles, unités). */
export interface ReferentielArticle {
  familles: { code: string; intitule: string; uniteVenteNo: number | null }[];
  unites: { no: number; intitule: string }[];
  depots: { no: number; intitule: string }[];
}

export interface CreerArticlePayload {
  reference: string;
  designation: string;
  codeFamille: string;
  uniteVenteNo?: number | null;
  prixAchat: number;
  prixVente?: number | null;
}

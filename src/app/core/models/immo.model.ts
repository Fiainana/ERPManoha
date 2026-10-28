/** Module immobilisations (ManohaEnergieAPI /api/immo). */

export type ImmoStatut = 'A_VALIDER' | 'EN_COURS' | 'EN_SERVICE' | 'CEDEE' | 'REBUT' | 'REJETEE';

export interface ImmoPlanLigne {
  annee: number;
  nbMois: number;
  cumulDebut: number;
  dotation: number;
  cumulFin: number;
  vnc: number;
}

export interface ImmoCategorie {
  id: number;
  code: string;
  libelle: string;
  compteImmo: string;
  compteAmortissement: string | null;
  compteDotation: string | null;
  compteEnCours: string | null;
  dureeAnsDefaut: number;
  amortissable: boolean;
  gestionParLot: boolean;
  famillesSage: string[];
  tauxDgiCode: string | null;
  tauxMaxDgi: number | null;
}

export interface ImmoCategorieRequest {
  libelle: string;
  compteImmo: string;
  compteAmortissement: string | null;
  compteDotation: string | null;
  compteEnCours: string | null;
  dureeAnsDefaut: number;
  amortissable: boolean;
  gestionParLot: boolean;
  famillesSage: string[];
  tauxDgiCode: string | null;
}

export interface ImmoFamilleSage {
  code: string;
  intitule: string;
  estImmo: boolean;
  categorieCode: string | null;
}

export interface ImmoFiche {
  id: number;
  numeroInventaire: string;
  designation: string;
  categorieId: number | null;
  categorieLibelle: string | null;
  valeurBrute: number;
  dureeAns: number;
  dateAcquisition: string | null;
  dateMiseEnService: string | null;
  statut: ImmoStatut;
  fournisseurCode: string | null;
  numeroSerie: string | null;
  site: string | null;
  responsable: string | null;
  note: string | null;
  pieceSage: string | null;
  ligneSage: number | null;
  articleSage: string | null;
  plan: ImmoPlanLigne[] | null;
}

export interface ImmoFicheRequest {
  designation?: string | null;
  categorieId?: number | null;
  valeurBrute?: number | null;
  dureeAns?: number | null;
  dateAcquisition?: string | null;
  dateMiseEnService?: string | null;
  fournisseurCode?: string | null;
  numeroSerie?: string | null;
  site?: string | null;
  responsable?: string | null;
  note?: string | null;
}

export interface ImmoValiderRequest {
  categorieId?: number | null;
  dureeAns?: number | null;
  dateMiseEnService?: string | null;
  accepterDepassementDgi?: boolean;
}

export interface ImmoSyncLigne {
  piece: string;
  dateFacture: string;
  fournisseur: string | null;
  article: string | null;
  designation: string;
  famille: string | null;
  quantite: number;
  montantHt: number;
  nbFiches: number;
  categorie: string | null;
  /** A_IMPORTER, SOUS_SEUIL ou IMPORTEE */
  resultat: string;
}

export interface ImmoSyncResultat {
  apercu: boolean;
  depuis: string;
  familles: string[];
  lignesLues: number;
  lignesImportees: number;
  fichesCreees: number;
  lignesSousSeuil: number;
  fichesSansCategorie: number;
  lignes: ImmoSyncLigne[];
}

export interface ImmoEcritureLigne {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
}

export type ImmoEcritureStatut = 'A_EXPORTER' | 'EN_COURS' | 'EXPORTEE' | 'ERREUR' | 'ANNULEE';

export interface ImmoEcriture {
  id: number;
  type: 'DOTATION' | 'MISE_EN_SERVICE' | 'CESSION' | 'REBUT';
  ficheId: number | null;
  dateEcriture: string;
  journal: string;
  numeroPiece: string;
  libelle: string;
  statut: ImmoEcritureStatut;
  messageErreur: string | null;
  dateExport: string | null;
  totalDebit: number;
  totalCredit: number;
  lignes: ImmoEcritureLigne[];
}

export interface ImmoExportResultat {
  exportees: number;
  enErreur: number;
  reportees: number;
  ecritures: { id: number; numeroPiece: string; statut: string; message: string | null }[];
}

export interface ImmoDotationLigne {
  ficheId: number;
  numeroInventaire: string;
  designation: string;
  categorie: string;
  annee: number;
  mois: number;
  montant: number;
}

export interface ImmoDotationResultat {
  apercu: boolean;
  annee: number;
  mois: number | null;
  nbFiches: number;
  nbLignes: number;
  total: number;
  ecriture: ImmoEcriture | null;
  fichesSansCompte: string[];
  lignes: ImmoDotationLigne[];
}

export interface ImmoSortieResultat {
  fiche: ImmoFiche;
  dotationComplementaire: number;
  amortissementsCumules: number;
  valeurNetteComptable: number;
  prixCession: number;
  plusOuMoinsValue: number;
  ecriture: ImmoEcriture;
}

export const IMMO_STATUTS: { value: ImmoStatut; label: string }[] = [
  { value: 'A_VALIDER', label: 'À valider' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_SERVICE', label: 'En service' },
  { value: 'CEDEE', label: 'Cédée' },
  { value: 'REBUT', label: 'Mise au rebut' },
  { value: 'REJETEE', label: 'Rejetée' },
];

export function libelleStatutImmo(s: string): string {
  return IMMO_STATUTS.find((x) => x.value === s)?.label ?? s;
}

export function libelleTypeEcriture(t: string): string {
  switch (t) {
    case 'DOTATION':
      return 'Dotation';
    case 'MISE_EN_SERVICE':
      return 'Mise en service';
    case 'CESSION':
      return 'Cession';
    case 'REBUT':
      return 'Mise au rebut';
    default:
      return t;
  }
}

export function libelleStatutEcriture(s: string): string {
  switch (s) {
    case 'A_EXPORTER':
      return 'À exporter';
    case 'EN_COURS':
      return 'En cours';
    case 'EXPORTEE':
      return 'Exportée';
    case 'ERREUR':
      return 'Erreur';
    case 'ANNULEE':
      return 'Annulée';
    default:
      return s;
  }
}

// —— État annuel et contrôles ——

export interface ImmoEtatFiche {
  ficheId: number;
  numeroInventaire: string;
  designation: string;
  statut: ImmoStatut;
  dateMiseEnService: string | null;
  dateSortie: string | null;
  dureeAns: number;
  taux: number;
  brutDebut: number;
  acquisitions: number;
  sorties: number;
  brutFin: number;
  amortDebut: number;
  dotation: number;
  amortSorties: number;
  amortFin: number;
  vncFin: number;
}

export interface ImmoEtatCategorie {
  categorieId: number | null;
  libelle: string;
  compteImmo: string | null;
  compteAmortissement: string | null;
  nbBiens: number;
  brutDebut: number;
  acquisitions: number;
  sorties: number;
  brutFin: number;
  amortDebut: number;
  dotation: number;
  amortSorties: number;
  amortFin: number;
  vncFin: number;
  fiches: ImmoEtatFiche[];
}

export interface ImmoEtatAnnuel {
  annee: number;
  genereLe: string;
  categories: ImmoEtatCategorie[];
  total: ImmoEtatCategorie;
  nbEnCours: number;
  valeurEnCours: number;
}

export type ImmoNiveau = 'ERREUR' | 'AVERTISSEMENT' | 'INFO';

export interface ImmoAlerte {
  code: string;
  niveau: ImmoNiveau;
  message: string;
  nombre: number;
  lien: string | null;
}

export interface ImmoRapprochement {
  compte: string;
  nature: 'Immobilisation' | 'Amortissement';
  categories: string;
  compteExiste: boolean;
  soldeApplication: number;
  soldeSage: number;
  ecart: number;
}

export interface ImmoControles {
  annee: number;
  genereLe: string;
  rapprochements: ImmoRapprochement[];
  alertes: ImmoAlerte[];
  nbErreurs: number;
  nbAvertissements: number;
}

// —— Historique, annulation d'écriture, clôture ——

export interface ImmoHistorique {
  id: number;
  ficheId: number | null;
  action: string;
  detail: string | null;
  utilisateur: string | null;
  dateAction: string;
}

export interface ImmoClotureResultat {
  annee: number;
  dateCloture: string;
}

export function libelleActionImmo(a: string): string {
  const m: Record<string, string> = {
    CREATION: 'Création',
    MODIFICATION: 'Modification',
    VALIDATION: 'Validation',
    MISE_EN_SERVICE: 'Mise en service',
    REJET: 'Rejet',
    CESSION: 'Cession',
    REBUT: 'Mise au rebut',
    SYNCHRO_ACHATS: 'Synchro des achats',
    DOTATIONS: 'Dotations générées',
    EXPORT_SAGE: 'Export vers Sage',
    ETIQUETTE: 'Étiquette imprimée',
    ETIQUETTES: 'Étiquettes imprimées',
    ANNULATION_ECRITURE: 'Écriture annulée',
    JOURNAL_ECRITURE: 'Journal modifié',
    CLOTURE: 'Clôture d’exercice',
    REOUVERTURE: 'Réouverture d’exercice',
  };
  return m[a] ?? a;
}

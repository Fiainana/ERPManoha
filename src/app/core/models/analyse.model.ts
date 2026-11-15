/** Menu Analyse — GET /api/admin/analyse/* (Admin). Montants HT en Ar, taux en %. */

export interface AnalysePeriode {
  debut: string;
  fin: string;
  nbJours: number;
  debutN1: string;
  finN1: string;
  granularite: Exclude<Granularite, 'auto'>;
  granulariteAuto: boolean;
}

export interface AnalysePage<T, R, E = { periode: AnalysePeriode }> {
  resume: R;
  extra: E;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
}

export interface AnalyseListeParams {
  search?: string;
  vue?: string;
  tri?: string;
  asc?: boolean;
  page?: number;
  pageSize?: number;
  famille?: string;
}

export interface Tranche {
  libelle: string;
  montant: number;
  nb: number;
}

export interface AnalyseAlerte {
  niveau: 'danger' | 'warn' | 'info';
  message: string;
  lien?: string | null;
}

export type Granularite = 'auto' | 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';

/** Tranche d'une série d'évolution (jour, semaine ISO, mois, trimestre ou année), bornée à la période. */
export interface TrancheBase {
  cle: string;
  libelle: string;
  debut: string;
  fin: string;
}

export interface AnalyseTranche extends TrancheBase {
  caHt: number;
  margeBrute: number;
  tauxMarquePct: number | null;
  achatsHt: number;
  nbFactures: number;
  panierMoyenHt: number;
  retoursHt: number;
  caHtN1: number;
  margeBruteN1: number;
  tauxMarquePctN1: number | null;
  achatsHtN1: number;
  nbFacturesN1: number;
  panierMoyenHtN1: number;
  retoursHtN1: number;
  evolutionPct: number | null;
}

export interface AnalyseSynthese {
  periode: AnalysePeriode;
  ventes: {
    caHt: number;
    caHtN1: number;
    evolutionPct: number | null;
    caTtc: number;
    caMoyenJourHt: number;
    ventesBrutesHt: number;
    retoursHt: number;
    tauxRetourPct: number | null;
    coutRevient: number;
    margeBrute: number;
    margeBruteN1: number;
    evolutionMargePct: number | null;
    tauxMarquePct: number | null;
    tauxMarquePctN1: number | null;
    tauxMargePct: number | null;
    coefficient: number | null;
    nbFactures: number;
    nbFacturesN1: number;
    panierMoyenHt: number;
    panierMoyenHtN1: number;
    evolutionPanierPct: number | null;
    nbClients: number;
    nbClientsN1: number;
    nbArticles: number;
  };
  devis: {
    nb: number;
    nbTransformes: number;
    nbEnCours: number;
    montantEnCoursHt: number;
    tauxTransformationPct: number | null;
  };
  achats: {
    achatsHt: number;
    achatsHtN1: number;
    evolutionPct: number | null;
    achatsTtc: number;
    nbFactures: number;
    nbFournisseurs: number;
    ratioAchatsVentesPct: number | null;
  };
  stock: {
    valeur: number;
    quantite: number;
    nbArticles: number;
    rotationAn: number | null;
    couvertureJours: number | null;
    valeurDormante: number;
    nbDormants: number;
    partDormantePct: number | null;
    nbRuptures: number;
    nbSousMini: number;
    joursDormant: number;
  };
  tresorerie: {
    creancesClients: number;
    nbFacturesImpayees: number;
    nbClientsDebiteurs: number;
    dsoJours: number | null;
    tranchesClients: Tranche[];
    partCreancesPlus90Pct: number | null;
    dettesFournisseurs: number;
    nbFacturesFournisseursNonReglees: number;
    dpoJours: number | null;
    tranchesFournisseurs: Tranche[];
    bfrExploitation: number;
    cycleConversionJours: number | null;
  };
  evolution: AnalyseTranche[];
  alertes: AnalyseAlerte[];
}

export interface AbcLigne {
  classe: 'A' | 'B' | 'C';
  caHt?: number;
  achatsHt?: number;
  partCaPct?: number | null;
  partAchatsPct?: number | null;
  nbArticles?: number;
  nbClients?: number;
  nbFournisseurs?: number;
  margeBrute?: number;
  partArticlesPct?: number | null;
}

// —— Articles ——
export interface ArticleAnalyse {
  reference: string;
  designation: string | null;
  familleCode: string | null;
  familleIntitule: string | null;
  enSommeil: boolean;
  suiviStock: boolean;
  prixVente: number;
  prixAchat: number;
  fournisseurNumero: string | null;
  fournisseurIntitule: string | null;
  qteVendue: number;
  caHt: number;
  coutRevient: number;
  margeBrute: number;
  tauxMarquePct: number | null;
  nbFactures: number;
  nbClients: number;
  caHtN1: number;
  qteVendueN1: number;
  evolutionPct: number | null;
  partCaPct: number | null;
  classe: 'A' | 'B' | 'C' | null;
  qteStock: number;
  valeurStock: number;
  qteMini: number;
  couvertureJours: number | null;
  derniereVente: string | null;
  joursSansVente: number | null;
  dormant: boolean;
  rupture: boolean;
  sousMini: boolean;
  margeNegative: boolean;
  margeFaible: boolean;
}

export interface ArticlesResume {
  nbArticlesVendus: number;
  caHt: number;
  margeBrute: number;
  tauxMarquePct: number | null;
  valeurStock: number;
  abc: AbcLigne[];
  nbDormants: number;
  valeurDormante: number;
  nbRuptures: number;
  nbSousMini: number;
  nbMargeNegative: number;
  nbMargeFaible: number;
  joursDormant: number;
  tauxMargeFaible: number;
}

export interface ArticlesExtra {
  periode: AnalysePeriode;
  familles: { code: string; intitule: string }[];
}

export interface ArticleDetailAnalyse {
  periode: AnalysePeriode;
  article: ArticleAnalyse;
  evolution: (TrancheBase & {
    qte: number;
    caHt: number;
    margeBrute: number;
    tauxMarquePct: number | null;
    qteN1: number;
    caHtN1: number;
    margeBruteN1: number;
    tauxMarquePctN1: number | null;
  })[];
  topClients: {
    numero: string;
    intitule: string | null;
    estComptoir: boolean;
    qte: number;
    caHt: number;
    margeBrute: number;
    tauxMarquePct: number | null;
    nbFactures: number;
    derniereVente: string | null;
  }[];
  stocks: {
    depotNo: number;
    depot: string | null;
    quantite: number;
    reserve: number;
    disponible: number;
    mini: number;
    maxi: number;
    valeur: number;
  }[];
  fournisseurs: {
    numero: string;
    intitule: string | null;
    referenceFournisseur: string | null;
    prixAchat: number;
    principal: boolean;
    delaiApproJours: number;
  }[];
  derniersAchats: {
    date: string;
    piece: string;
    type: string;
    fournisseurNumero: string;
    fournisseur: string | null;
    quantite: number;
    prixUnitaire: number;
    montantHt: number;
  }[];
}

export interface FamilleAnalyse {
  code: string;
  intitule: string;
  nbArticlesVendus: number;
  nbArticlesEnStock: number;
  caHt: number;
  partCaPct: number | null;
  caHtN1: number;
  evolutionPct: number | null;
  margeBrute: number;
  tauxMarquePct: number | null;
  partMargePct: number | null;
  valeurStock: number;
  rotationAn: number | null;
  couvertureJours: number | null;
  nbDormants: number;
  valeurDormante: number;
  nbRuptures: number;
}

// —— Clients ——
export type StatutClient = 'Nouveau' | 'Perdu' | 'EnHausse' | 'EnBaisse' | 'Stable' | 'Inactif';

export interface ClientAnalyse {
  numero: string;
  intitule: string | null;
  telephone: string | null;
  ville: string | null;
  representant: string | null;
  estComptoir: boolean;
  enSommeil: boolean;
  caHt: number;
  caHtN1: number;
  evolutionPct: number | null;
  margeBrute: number;
  tauxMarquePct: number | null;
  nbFactures: number;
  nbFacturesN1: number;
  panierMoyenHt: number;
  nbArticles: number;
  partCaPct: number | null;
  classe: 'A' | 'B' | 'C' | null;
  premiereFacture: string | null;
  derniereFacture: string | null;
  joursSansAchat: number | null;
  frequenceJours: number | null;
  encours: number;
  encoursPlus90: number;
  nbFacturesImpayees: number;
  agePlusAncienImpaye: number | null;
  statut: StatutClient;
  scoreR: number | null;
  scoreF: number | null;
  scoreM: number | null;
  segment: string | null;
}

export interface ClientsResume {
  nbActifs: number;
  nbActifsN1: number;
  nbNouveaux: number;
  caNouveaux: number;
  nbPerdus: number;
  caPerdusN1: number;
  nbEnBaisse: number;
  nbEnHausse: number;
  caHt: number;
  margeBrute: number;
  tauxMarquePct: number | null;
  partComptoirPct: number | null;
  partTop10Pct: number | null;
  abc: AbcLigne[];
  encours: number;
  encoursPlus90: number;
  nbClientsARisque: number;
  clientComptoir: string;
  fidelisation: Fidelisation;
  segments: SegmentRfm[];
}

export interface ClientDetailAnalyse {
  periode: AnalysePeriode;
  client: ClientAnalyse;
  evolution: (TrancheBase & {
    caHt: number;
    margeBrute: number;
    tauxMarquePct: number | null;
    nbFactures: number;
    caHtN1: number;
    margeBruteN1: number;
    tauxMarquePctN1: number | null;
    nbFacturesN1: number;
  })[];
  topArticles: {
    reference: string;
    designation: string | null;
    qte: number;
    caHt: number;
    margeBrute: number;
    tauxMarquePct: number | null;
    nbFactures: number;
    derniereVente: string | null;
  }[];
  facturesImpayees: { numeroPiece: string; date: string; totalTtc: number; reste: number; ageJours: number }[];
}

// —— Fournisseurs ——
export interface FournisseurAnalyse {
  numero: string;
  intitule: string | null;
  telephone: string | null;
  ville: string | null;
  achatsHt: number;
  achatsHtN1: number;
  evolutionPct: number | null;
  partAchatsPct: number | null;
  classe: 'A' | 'B' | 'C' | null;
  nbFactures: number;
  nbArticlesAchetes: number;
  dernierAchat: string | null;
  variationPrixPct: number | null;
  nbArticlesCompares: number;
  nbHaussesPrix: number;
  dettesHt: number;
  nbFacturesNonReglees: number;
  nbBcEnCours: number;
  montantBcEnCoursHt: number;
  nbArticlesPrincipal: number;
  caVentesHt: number;
  margeVentes: number;
  tauxMarqueVentesPct: number | null;
  valeurStock: number;
  couvertureJours: number | null;
}

export interface FournisseursResume {
  nbActifs: number;
  nbActifsN1: number;
  achatsHt: number;
  achatsHtN1: number;
  evolutionPct: number | null;
  partPremierPct: number | null;
  partTop3Pct: number | null;
  dettes: number;
  montantBcEnCoursHt: number;
  nbBcEnCours: number;
  nbFournisseursHaussePrix: number;
  abc: AbcLigne[];
}

export interface FournisseurDetailAnalyse {
  periode: AnalysePeriode;
  fournisseur: FournisseurAnalyse;
  evolution: (TrancheBase & { achatsHt: number; nbFactures: number; achatsHtN1: number; nbFacturesN1: number })[];
  articles: {
    reference: string;
    designation: string | null;
    qte: number;
    montantHt: number;
    puMoyen: number | null;
    puMoyenN1: number | null;
    variationPct: number | null;
  }[];
  facturesNonReglees: { numeroPiece: string; date: string; totalTtc: number; reste: number; ageJours: number }[];
  commandesEnCours: { numeroPiece: string; date: string; reference: string | null; totalHt: number; ageJours: number }[];
}

// —— Commerciaux ——
export interface CommercialAnalyse {
  coNo: number;
  nom: string;
  caHt: number;
  partCaPct: number | null;
  caHtN1: number;
  evolutionPct: number | null;
  margeBrute: number;
  margeBruteN1: number;
  tauxMarquePct: number | null;
  retoursHt: number;
  nbFactures: number;
  nbClients: number;
  panierMoyenHt: number;
  devisEnCours: number;
  montantDevisEnCoursHt: number;
  devisTransformes: number;
  tauxTransformationPct: number | null;
  encours: number;
  encoursPlus90: number;
}

export interface AnalyseListeSimple<T> {
  periode: AnalysePeriode;
  caHt: number;
  items: T[];
}

// —— Magasin & marketing ——
export interface KpiCanal {
  canal: string;
  caHt: number;
  partCaPct: number | null;
  margeBrute: number;
  tauxMarquePct: number | null;
  nbTickets: number;
  panierMoyenHt: number;
  panierNetMoyenHt: number;
  lignesParTicket: number | null;
  qteParTicket: number | null;
  prixMoyenUnitaireHt: number;
  remiseHt: number;
  tauxRemisePct: number | null;
  retoursHt: number;
  tauxRetourPct: number | null;
  nbClients: number;
  joursDeVente: number;
  caParJourDeVente: number;
  ticketsParJourDeVente: number | null;
}

export interface Fidelisation {
  nbClientsActifs: number;
  nbClientsActifsN1: number;
  tauxRetentionPct: number | null;
  tauxAttritionPct: number | null;
  tauxReachatPct: number | null;
  partNouveauxPct: number | null;
  frequenceAchat: number | null;
  delaiMoyenEntreAchatsJours: number | null;
  caMoyenParClient: number;
  margeMoyenneParClient: number;
  panierMoyenHt: number;
}

export interface SegmentRfm {
  id: string;
  libelle: string;
  action: string;
  nbClients: number;
  partClientsPct: number | null;
  caHt: number;
  partCaPct: number | null;
  caHtN1: number;
  encours: number;
}

export interface AnalyseMagasin {
  periode: AnalysePeriode;
  clientComptoir: string;
  total: KpiCanal;
  canaux: KpiCanal[];
  parJourSemaine: {
    jour: number;
    libelle: string;
    nbJours: number;
    nbJoursAvecVente: number;
    caHt: number;
    partCaPct: number | null;
    nbTickets: number;
    caMoyenParJour: number;
    ticketsMoyensParJour: number | null;
    panierMoyenHt: number;
  }[];
  parHeure: { heure: number; libelle: string; caHt: number; nbTickets: number; partTicketsPct: number | null }[];
  affluence: { jour: number; heure: number; nbTickets: number; caHt: number }[];
  vendeurs: {
    coNo: number;
    nom: string;
    caHt: number;
    partCaPct: number | null;
    caComptoirHt: number;
    margeBrute: number;
    tauxMarquePct: number | null;
    nbTickets: number;
    panierMoyenHt: number;
    lignesParTicket: number | null;
    remiseHt: number;
    tauxRemisePct: number | null;
    retoursHt: number;
    joursDeVente: number;
    caParJourDeVente: number;
  }[];
  encaissements: {
    mode: number;
    libelle: string;
    nb: number;
    montant: number;
    montantComptoir: number;
    partPct: number | null;
    moyenneParReglement: number;
  }[];
  stock: {
    valeurStock: number;
    gmroi: number | null;
    rotationAn: number | null;
    nbArticlesVendus: number;
    nbArticlesEnRupture: number;
    tauxRupturePct: number | null;
    tauxEcoulementPct: number | null;
    nbArticlesEnStock: number;
    tauxDormantPct: number | null;
    valeurDormante: number;
    nbSousMini: number;
  };
  demarque: {
    nbInventaires: number;
    nbLignesComptees: number;
    nbEcarts: number;
    tauxEcartPct?: number | null;
    surplusValeur?: number;
    manquantsValeur?: number;
    ecartNetValeur?: number;
    tauxDemarquePct?: number | null;
  };
  fidelisation: Fidelisation;
  segments: SegmentRfm[];
  associations: {
    articleA: string;
    designationA: string | null;
    articleB: string;
    designationB: string | null;
    nbTicketsEnsemble: number;
    supportPct: number | null;
    confianceAversBPct: number | null;
    confianceBversAPct: number | null;
    lift: number | null;
  }[];
}
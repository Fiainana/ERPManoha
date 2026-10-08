export interface ObjectifCommercialLigne {
  id: number;
  sageMatricule: string;
  nomComplet?: string | null;
  login?: string | null;
  annee: number;
  mois: number;
  montantObjectif: number;
  caRealise: number;
  nbFactures: number;
  tauxRealisationPct: number;
  ecart: number;
  dateMaj?: string | null;
}

export interface ObjectifCommercialResume {
  annee: number;
  mois: number;
  objectifTotal: number;
  caRealiseTotal: number;
  tauxMoyenPct: number;
  lignes: ObjectifCommercialLigne[];
}

export interface UpsertObjectifRequest {
  sageMatricule: string;
  annee: number;
  mois: number;
  montantObjectif: number;
}

/** Paramètres métier stockés en base — GET/PUT /api/admin/parametres */

export type TypeParametre =
  | 'Texte'
  | 'Entier'
  | 'Decimal'
  | 'Booleen'
  | 'ListeTexte'
  | 'ListeEntier'
  | 'JourSemaine'
  | 'Email'
  | 'Secret';

export type ValeurParametre = string | number | boolean | string[] | number[] | null;

export interface Parametre {
  cle: string;
  libelle: string;
  description?: string | null;
  type: TypeParametre;
  min?: number | null;
  max?: number | null;
  obligatoire: boolean;
  unite?: string | null;
  verification: 'Aucune' | 'Client' | 'Fournisseur' | 'Depots';
  /** Valeur effective (base, sinon appsettings, sinon défaut du code). Toujours null pour un secret. */
  valeur: ValeurParametre;
  /** Valeur utilisée si la base ne définit rien. */
  valeurDefaut: ValeurParametre;
  /** Secret uniquement : un mot de passe est-il enregistré ? */
  secretDefini?: boolean | null;
  enBase: boolean;
  modifieLe?: string | null;
  modifiePar?: string | null;
}

export interface GroupeParametres {
  id: string;
  libelle: string;
  description: string;
  parametres: Parametre[];
}

export interface DepotSage {
  numero: number;
  intitule?: string | null;
}

export interface ParametresApp {
  groupes: GroupeParametres[];
  depots: DepotSage[];
}

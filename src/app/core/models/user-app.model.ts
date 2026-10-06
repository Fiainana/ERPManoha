/** Utilisateur applicatif (API /api/admin/users) */
export interface UserApp {
  id?: number;
  login?: string | null;
  nom?: string | null;
  prenom?: string | null;
  sageMatricule?: string | null;
  matricule?: string | null;
  fonction?: string | null;
  service?: string | null;
  isAdmin?: boolean;
  roles?: string | string[] | null;
  actif?: boolean;
  hasPassword?: boolean;
  hasRfid?: boolean;
  hasPin?: boolean;
  derniereConnexion?: string | null;
  vendeur?: boolean;
  acheteur?: boolean;
  caissier?: boolean;
  chargeRecouvrement?: boolean;
  receptionnaire?: boolean;
}

export interface CreateUserAppRequest {
  login: string;
  password?: string;
  rfidCode?: string;
  pin?: string;
  nom: string;
  prenom?: string;
  matricule?: string;
  fonction?: string;
  service?: string;
  vendeur?: boolean;
  acheteur?: boolean;
  caissier?: boolean;
  chargeRecouvrement?: boolean;
  receptionnaire?: boolean;
  isAdmin?: boolean;
  actif?: boolean;
  /** Admin, Vendeur, Caisse, Commercial, Depot, Recouvrement */
  roles?: string[];
}

export interface UpdateUserAppRequest {
  login?: string;
  nom?: string;
  prenom?: string;
  fonction?: string;
  service?: string;
  isAdmin?: boolean;
  actif?: boolean;
  roles?: string[];
  vendeur?: boolean;
  acheteur?: boolean;
  caissier?: boolean;
  chargeRecouvrement?: boolean;
  receptionnaire?: boolean;
}

export const APP_ROLE_OPTIONS = [
  { value: 'Commercial', label: 'Commercial', hint: 'CRM B2B, devis, clients' },
  { value: 'Vendeur', label: 'Vendeur', hint: 'Comptoir / caisse vente' },
  { value: 'Caisse', label: 'Caisse', hint: 'Encaissement comptoir' },
  { value: 'Depot', label: 'Dépôt', hint: 'Stock, réceptions, BR' },
  { value: 'Recouvrement', label: 'Recouvrement', hint: 'Impayés & règlements' },
  { value: 'Admin', label: 'Admin', hint: 'Administration complète' },
] as const;

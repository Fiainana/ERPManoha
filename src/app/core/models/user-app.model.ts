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
  /** Collaborateur Sage existant à lier ; vide = création d'un nouveau collaborateur */
  sageMatricule?: string;
  fonction?: string;
  service?: string;
  vendeur?: boolean;
  acheteur?: boolean;
  caissier?: boolean;
  chargeRecouvrement?: boolean;
  receptionnaire?: boolean;
  isAdmin?: boolean;
  actif?: boolean;
  /** Admin, Vendeur, Caisse, Commercial, Depot, Recouvrement, Responsable */
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
  /** Absent = inchangé, '' = délier, sinon matricule du collaborateur Sage */
  sageMatricule?: string;
}

/** Collaborateur Sage (GET /api/admin/users/collaborateurs-sage) */
export interface CollaborateurSage {
  no: number;
  matricule: string | null;
  nom: string;
  prenom: string | null;
  fonction: string | null;
  vendeur: boolean;
  caissier: boolean;
  acheteur: boolean;
  sommeil: boolean;
  /** Logins déjà liés à ce collaborateur */
  utilisateurs: string[];
}

export const APP_ROLE_OPTIONS = [
  { value: 'Commercial', label: 'Commercial', hint: 'CRM B2B, devis, clients' },
  { value: 'Vendeur', label: 'Vendeur', hint: 'Comptoir / caisse vente' },
  { value: 'Caisse', label: 'Caisse', hint: 'Encaissement comptoir' },
  { value: 'Depot', label: 'Dépôt', hint: 'Stock, réceptions, BR' },
  { value: 'Recouvrement', label: 'Recouvrement', hint: 'Impayés & règlements' },
  {
    value: 'Responsable',
    label: 'Responsable',
    hint: 'Validation retours caisse (FA → BR) via badge RFID',
  },
  { value: 'HR', label: 'RH', hint: 'Ressources humaines : employés, congés, présence, pointeuse' },
  {
    value: 'ResponsableRH',
    label: 'Responsable d’équipe',
    hint: 'Avis sur les demandes d’absence de son département',
  },
  { value: 'Admin', label: 'Admin', hint: 'Administration complète' },
] as const;

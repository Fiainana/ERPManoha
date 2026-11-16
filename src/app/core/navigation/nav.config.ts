import { AppRole } from '../models/api-response';

export interface NavItem {
  label: string;
  route: string;
  /** Si vide / undefined → visible pour tout utilisateur authentifié */
  roles?: AppRole[];
  icon?: string;
  /** Actif seulement sur la route exacte (ex. /rh, dont les autres écrans sont des sous-routes). */
  exact?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  /** Section du menu (titre affiché au-dessus du premier groupe visible de la section). */
  section: NavSection;
  roles?: AppRole[];
  items: NavItem[];
  /** Lien direct sans sous-menu */
  route?: string;
}

export type NavSection =
  | 'Pilotage'
  | 'Commercial'
  | 'Stock & dépôt'
  | 'Comptabilité'
  | 'Ressources humaines'
  | 'Administration';

const ADMIN: AppRole[] = ['Admin'];
const DEPOT: AppRole[] = ['Admin', 'Depot'];
const RH: AppRole[] = ['Admin', 'HR'];
/** Planning des repos : modification et saisie des pointages manquants. */
const RH_PLANNING: AppRole[] = ['Admin', 'HR', 'Planning'];
const COMPTA: AppRole[] = ['Admin', 'Compta'];
const ACHAT: AppRole[] = ['Admin', 'Achat'];
const CAISSE: AppRole[] = ['Admin', 'Caisse'];

/**
 * Menu ERP, organisé par métier (hors comptoir et borne d'impression).
 * Un groupe n'apparaît que si l'utilisateur a accès à au moins un de ses écrans.
 */
export const NAV_GROUPS: NavGroup[] = [
  // —— Pilotage ——
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: 'dashboard',
    section: 'Pilotage',
    route: '/',
    items: [],
  },
  {
    id: 'rapports',
    label: 'Rapports',
    icon: 'report',
    section: 'Pilotage',
    roles: ADMIN,
    items: [
      { label: 'État de vente comptoir', route: '/etat/comptoir', roles: ADMIN },
      { label: 'État de vente B2B', route: '/etat/b2b', roles: ADMIN },
      { label: 'État de vente consolidé', route: '/etat/tous', roles: ADMIN },
      { label: 'Journal de caisse', route: '/etat/journal-caisse', roles: ADMIN },
      { label: 'Rapport par e-mail', route: '/etat/rapport-mail', roles: ADMIN },
    ],
  },

  {
    id: 'analyse',
    label: 'Analytique',
    icon: 'analytics',
    section: 'Pilotage',
    roles: ADMIN,
    items: [
      { label: 'Synthèse et ratios', route: '/analyse', roles: ADMIN, exact: true },
      { label: 'Magasin', route: '/analyse/magasin', roles: ADMIN },
      { label: 'Marketing et clientèle', route: '/analyse/marketing', roles: ADMIN },
      { label: 'Articles', route: '/analyse/articles', roles: ADMIN },
      { label: 'Familles', route: '/analyse/familles', roles: ADMIN },
      { label: 'Clients', route: '/analyse/clients', roles: ADMIN },
      { label: 'Fournisseurs', route: '/analyse/fournisseurs', roles: ADMIN },
      { label: 'Commerciaux', route: '/analyse/commerciaux', roles: ADMIN },
    ],
  },

  // —— Caisse ——
  {
    id: 'caisse',
    label: 'Caisse',
    icon: 'payments',
    section: 'Commercial',
    roles: CAISSE,
    items: [
      { label: 'Clôture du jour', route: '/caisse/cloture', roles: CAISSE },
      { label: 'Historique des clôtures', route: '/caisse/clotures', roles: CAISSE },
    ],
  },

  // —— Commercial ——
  {
    id: 'vente',
    label: 'Ventes',
    icon: 'sell',
    section: 'Commercial',
    roles: ['Admin', 'Commercial', 'Recouvrement'],
    items: [
      { label: 'Clients', route: '/vente/clients', roles: ['Admin', 'Commercial', 'Recouvrement'] },
      { label: 'Devis', route: '/vente/devis', roles: ['Admin', 'Commercial'] },
      { label: 'Factures', route: '/vente/factures', roles: ['Admin', 'Commercial'] },
      { label: 'Objectifs CA', route: '/vente/objectifs', roles: ADMIN },
    ],
  },
  {
    id: 'achats',
    label: 'Achats',
    icon: 'shopping',
    section: 'Commercial',
    roles: ACHAT,
    items: [
      { label: 'Demandes d’achat', route: '/achats/demandes', roles: ACHAT },
      { label: 'Préparations', route: '/achats/preparations', roles: ACHAT },
      { label: 'Bons de commande', route: '/achats/commandes', roles: ACHAT },
      { label: 'Bons de livraison', route: '/achats/receptions', roles: ACHAT },
      { label: 'Factures fournisseurs', route: '/achats/factures', roles: ACHAT },
      { label: 'Fournisseurs', route: '/fournisseurs', roles: ACHAT },
    ],
  },

  // —— Stock & dépôt ——
  {
    id: 'articles',
    label: 'Articles',
    icon: 'inventory',
    section: 'Stock & dépôt',
    route: '/articles',
    roles: ['Admin', 'Commercial', 'Vendeur', 'Rayon', 'Caisse', 'Depot', 'Recouvrement'],
    items: [],
  },
  {
    id: 'depot',
    label: 'Dépôt',
    icon: 'warehouse',
    section: 'Stock & dépôt',
    roles: DEPOT,
    items: [
      { label: 'Réception des commandes', route: '/depot/bc-reception', roles: DEPOT },
      { label: 'Bons de retour', route: '/depot/bons-retour', roles: DEPOT },
      { label: 'Factures de retour', route: '/depot/factures-retour', roles: DEPOT },
      { label: 'Inventaire', route: '/depot/inventaire', roles: DEPOT },
      { label: 'Mouvements de stock', route: '/depot/mouvements-stock', roles: DEPOT },
    ],
  },

  // —— Comptabilité ——
  {
    id: 'immo',
    label: 'Immobilisations',
    icon: 'immo',
    section: 'Comptabilité',
    roles: COMPTA,
    items: [
      { label: 'Fiches', route: '/immo', roles: COMPTA, exact: true },
      { label: 'Dotations', route: '/immo/dotations', roles: COMPTA },
      { label: 'Écritures Sage', route: '/immo/ecritures', roles: COMPTA },
      { label: 'État annuel', route: '/immo/etat', roles: COMPTA },
      { label: 'Contrôles', route: '/immo/controles', roles: COMPTA },
      { label: 'Catégories', route: '/immo/categories', roles: COMPTA },
      { label: 'Historique', route: '/immo/historique', roles: COMPTA },
    ],
  },

  // —— Ressources humaines ——
  {
    id: 'rh',
    label: 'Ressources humaines',
    icon: 'hr',
    section: 'Ressources humaines',
    items: [
      { label: 'Tableau de bord RH', route: '/rh', roles: RH, exact: true },
      { label: 'Employés', route: '/rh/employes', roles: RH },
      { label: 'Mes congés', route: '/rh/mes-conges' },
      { label: 'Planning des repos', route: '/rh/planning' },
      { label: 'Congés & absences', route: '/rh/absences', roles: RH },
      { label: 'Présence', route: '/rh/presence', roles: RH_PLANNING },
      { label: 'Pointeuse', route: '/rh/pointeuse', roles: RH },
      { label: 'Paie', route: '/rh/paie', roles: ADMIN, exact: true },
      { label: 'Paramètres de paie', route: '/rh/paie/parametres', roles: ADMIN },
      { label: 'Référentiels', route: '/rh/referentiels', roles: RH },
    ],
  },

  // —— Administration ——
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    icon: 'users',
    section: 'Administration',
    route: '/utilisateurs',
    roles: ADMIN,
    items: [],
  },
  {
    id: 'suivi-gps',
    label: 'Suivi GPS',
    icon: 'gps',
    section: 'Administration',
    route: '/suivi-gps',
    roles: ADMIN,
    items: [],
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    icon: 'settings',
    section: 'Administration',
    route: '/parametres',
    roles: ADMIN,
    items: [],
  },
];

import { AppRole } from '../models/api-response';

export interface NavItem {
  label: string;
  route: string;
  /** Si vide / undefined → visible pour tout utilisateur authentifié */
  roles?: AppRole[];
  icon?: string;
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

export type NavSection = 'Pilotage' | 'Commercial' | 'Stock & dépôt' | 'Administration';

const ADMIN: AppRole[] = ['Admin'];
const DEPOT: AppRole[] = ['Admin', 'Depot'];

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
    id: 'achat',
    label: 'Achats',
    icon: 'shopping',
    section: 'Commercial',
    roles: ['Admin', 'Commercial', 'Depot'],
    items: [
      { label: "Mes demandes d'achat", route: '/achat/demandes-achat', roles: ['Admin', 'Commercial'] },
      { label: "Demandes d'achat à traiter", route: '/achat/demandes-achat-admin', roles: ADMIN },
      { label: "Préparations d'achat", route: '/achat/prepa-achat', roles: ADMIN },
      { label: 'Bons de commande', route: '/achat/bc-achat', roles: DEPOT },
      { label: 'Réceptions (BL)', route: '/achat/bl-achat', roles: DEPOT },
      { label: 'Factures fournisseurs', route: '/achat/factures-achat', roles: ADMIN },
      { label: 'Fournisseurs', route: '/achat/fournisseurs', roles: ADMIN },
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

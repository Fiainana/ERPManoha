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
  roles?: AppRole[];
  items: NavItem[];
  route?: string;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: 'dashboard',
    route: '/',
    items: [],
  },
  {
    id: 'articles',
    label: 'Articles',
    icon: 'inventory',
    route: '/articles',
    roles: ['Admin', 'Commercial', 'Vendeur', 'Rayon', 'Caisse', 'Depot', 'Recouvrement'],
    items: [],
  },
  {
    id: 'vente',
    label: 'Vente',
    icon: 'sell',
    roles: ['Admin', 'Commercial', 'Recouvrement'],
    items: [
      { label: 'Clients', route: '/vente/clients', roles: ['Admin', 'Commercial', 'Recouvrement'] },
      { label: 'Devis', route: '/vente/devis', roles: ['Admin', 'Commercial'] },
      { label: 'Factures', route: '/vente/factures', roles: ['Admin', 'Commercial'] },
      { label: 'Demandes devis import', route: '/vente/demandes-devis-import', roles: ['Admin', 'Commercial'] },
    ],
  },
  {
    id: 'etat',
    label: 'État',
    icon: 'dashboard',
    roles: ['Admin'],
    items: [
      { label: 'État vente comptoir', route: '/etat/comptoir', roles: ['Admin'] },
      { label: 'État vente B2B', route: '/etat/b2b', roles: ['Admin'] },
      { label: 'État vente consolidé', route: '/etat/tous', roles: ['Admin'] },
      { label: 'Journal de caisse', route: '/etat/journal-caisse', roles: ['Admin'] },
    ],
  },
  {
    id: 'achat',
    label: 'Achat',
    icon: 'shopping',
    roles: ['Admin', 'Commercial', 'Depot'],
    items: [
      { label: 'Fournisseurs', route: '/achat/fournisseurs', roles: ['Admin'] },
      { label: "Mes demandes d'achat", route: '/achat/demandes-achat', roles: ['Admin', 'Commercial'] },
      { label: "Demandes d'achat (Admin)", route: '/achat/demandes-achat-admin', roles: ['Admin'] },
      { label: "Préparations d'achat", route: '/achat/prepa-achat', roles: ['Admin'] },
      { label: 'BC Achat', route: '/achat/bc-achat', roles: ['Admin', 'Depot'] },
      { label: 'BL / Réceptions', route: '/achat/bl-achat', roles: ['Admin', 'Depot'] },
      { label: 'Factures achat', route: '/achat/factures-achat', roles: ['Admin'] },
    ],
  },
  {
    id: 'depot',
    label: 'Dépôt',
    icon: 'warehouse',
    roles: ['Admin', 'Depot'],
    items: [
      { label: 'Bons de retour', route: '/depot/bons-retour', roles: ['Admin', 'Depot'] },
      { label: 'BC Achat (réception)', route: '/depot/bc-reception', roles: ['Admin', 'Depot'] },
      { label: 'Inventaire', route: '/depot/inventaire', roles: ['Admin', 'Depot'] },
      { label: 'Mouvements de stock', route: '/depot/mouvements-stock', roles: ['Admin', 'Depot'] },
      { label: 'Factures retour', route: '/depot/factures-retour', roles: ['Admin', 'Depot'] },
    ],
  },
  {
    id: 'recouvrement',
    label: 'Recouvrement',
    icon: 'payments',
    route: '/recouvrement',
    roles: ['Admin', 'Recouvrement'],
    items: [],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    icon: 'users',
    route: '/utilisateurs',
    roles: ['Admin'],
    items: [],
  },
];

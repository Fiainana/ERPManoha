import { AppRole } from '../models/api-response';
import { DashboardAction, DashboardInsight, DashboardProfile } from './dashboard.model';

/**
 * Configuration pure du tableau de bord (domaine).
 * Aucune dépendance Angular — testable unitairement.
 */
export const DASHBOARD_ACTIONS: DashboardAction[] = [
  {
    id: 'clients',
    label: 'Clients',
    description: 'Portefeuille B2B',
    route: '/vente/clients',
    icon: 'clients',
    roles: ['Admin', 'Commercial', 'Recouvrement'],
  },
  {
    id: 'devis',
    label: 'Devis',
    description: 'Propositions commerciales',
    route: '/vente/devis',
    icon: 'devis',
    roles: ['Admin', 'Commercial'],
  },
  {
    id: 'factures',
    label: 'Factures vente',
    description: 'Facturation B2B',
    route: '/vente/factures',
    icon: 'factures',
    roles: ['Admin', 'Commercial'],
  },
  {
    id: 'articles',
    label: 'Articles',
    description: 'Catalogue & stocks',
    route: '/articles',
    icon: 'articles',
    roles: ['Admin', 'Commercial', 'Vendeur', 'Rayon', 'Caisse', 'Depot', 'Recouvrement'],
  },
  {
    id: 'mes-da',
    label: "Mes demandes d'achat",
    description: 'Demandes commerciales',
    route: '/achat/demandes-achat',
    icon: 'achat',
    roles: ['Admin', 'Commercial'],
  },
  {
    id: 'da-admin',
    label: "Demandes d'achat (Admin)",
    description: 'Validation & BC',
    route: '/achat/demandes-achat-admin',
    icon: 'achat',
    roles: ['Admin'],
  },
  {
    id: 'bc-achat',
    label: 'BC Achat',
    description: 'Commandes fournisseurs',
    route: '/achat/bc-achat',
    icon: 'achat',
    roles: ['Admin', 'Depot'],
  },
  {
    id: 'receptions',
    label: 'Réceptions',
    description: 'BL fournisseurs',
    route: '/achat/bl-achat',
    icon: 'depot',
    roles: ['Admin', 'Depot'],
  },
  {
    id: 'bons-retour',
    label: 'Bons de retour',
    description: 'Retours dépôt',
    route: '/depot/bons-retour',
    icon: 'depot',
    roles: ['Admin', 'Depot'],
  },
  {
    id: 'inventaire',
    label: 'Inventaire',
    description: 'Contrôle de stock',
    route: '/depot/inventaire',
    icon: 'depot',
    roles: ['Admin', 'Depot'],
  },
  {
    id: 'mouvements',
    label: 'Mouvements stock',
    description: 'Historique dépôts',
    route: '/depot/mouvements-stock',
    icon: 'depot',
    roles: ['Admin', 'Depot'],
  },
  {
    id: 'recouvrement',
    label: 'Recouvrement',
    description: 'Suivi des encaissements',
    route: '/recouvrement',
    icon: 'recouvrement',
    roles: ['Admin', 'Recouvrement'],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    description: 'Comptes & rôles',
    route: '/utilisateurs',
    icon: 'users',
    roles: ['Admin'],
  },
];

export const DASHBOARD_INSIGHTS: DashboardInsight[] = [
  {
    id: 'commercial-pipeline',
    title: 'Pipeline commercial',
    description: 'Devis → facture B2B, sans bon de livraison intermédiaire.',
    roles: ['Admin', 'Commercial'],
    tone: 'accent',
  },
  {
    id: 'depot-ops',
    title: 'Opérations dépôt',
    description: 'Réceptions, retours et inventaires centralisés hors borne RFID.',
    roles: ['Admin', 'Depot'],
    tone: 'info',
  },
  {
    id: 'recouvrement-focus',
    title: 'Recouvrement',
    description: 'Suivi des factures et règlements multi-clients.',
    roles: ['Admin', 'Recouvrement'],
    tone: 'default',
  },
  {
    id: 'admin-governance',
    title: 'Pilotage',
    description: 'Validation des demandes d’achat, fournisseurs et utilisateurs.',
    roles: ['Admin'],
    tone: 'accent',
  },
  {
    id: 'catalogue',
    title: 'Catalogue',
    description: 'Consultez les articles et stocks disponibles selon votre dépôt.',
    roles: ['Vendeur', 'Rayon', 'Caisse'],
    tone: 'default',
  },
];

const ROLE_PROFILES: Partial<Record<AppRole, DashboardProfile>> = {
  Admin: {
    greeting: 'Espace administration',
    focus: 'Pilotage global · achats · utilisateurs · dépôt',
  },
  Commercial: {
    greeting: 'Espace commercial',
    focus: 'Clients · devis · factures · demandes d’achat',
  },
  Depot: {
    greeting: 'Espace dépôt',
    focus: 'Réceptions · retours · inventaire · mouvements',
  },
  Recouvrement: {
    greeting: 'Espace recouvrement',
    focus: 'Factures · encaissements · suivi clients',
  },
  Vendeur: {
    greeting: 'Espace vente',
    focus: 'Catalogue articles et stocks',
  },
  Rayon: {
    greeting: 'Espace rayon',
    focus: 'Catalogue articles et stocks',
  },
  Caisse: {
    greeting: 'Espace caisse',
    focus: 'Consultation catalogue et stocks',
  },
};

export function resolveDashboardProfile(roles: string[]): DashboardProfile {
  if (roles.includes('Admin')) return ROLE_PROFILES.Admin!;
  for (const r of roles) {
    const p = ROLE_PROFILES[r as AppRole];
    if (p) return p;
  }
  return {
    greeting: 'Tableau de bord',
    focus: 'Sélectionnez un module dans le menu',
  };
}

export function filterByRoles<T extends { roles: AppRole[] }>(
  items: T[],
  userRoles: string[]
): T[] {
  const isAdmin = userRoles.includes('Admin');
  return items.filter(
    (item) => isAdmin || item.roles.some((r) => userRoles.includes(r))
  );
}

import { AppRole } from '../models/api-response';

/** Raccourci d'action sur le tableau de bord */
export interface DashboardAction {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: 'clients' | 'devis' | 'factures' | 'articles' | 'achat' | 'depot' | 'users' | 'recouvrement';
  roles: AppRole[];
}

/** Indicateur / carte informative */
export interface DashboardInsight {
  id: string;
  title: string;
  description: string;
  roles: AppRole[];
  tone?: 'default' | 'accent' | 'info';
}

export interface DashboardProfile {
  greeting: string;
  focus: string;
}

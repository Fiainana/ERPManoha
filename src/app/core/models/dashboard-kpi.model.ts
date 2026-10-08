/** KPI bruts normalisés pour le tableau de bord ERP. */

export interface DashboardKpiCard {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'accent' | 'warn' | 'ok';
  route?: string;
}

export interface DashboardKpiListItem {
  title: string;
  subtitle?: string;
  value?: string;
  route?: string;
}

export interface DashboardKpiBundle {
  mode: 'admin' | 'commercial' | 'recouvrement' | 'depot' | 'none';
  periodeLabel?: string;
  cards: DashboardKpiCard[];
  lists: { title: string; items: DashboardKpiListItem[]; empty?: string }[];
}

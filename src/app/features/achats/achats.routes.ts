import { Routes } from '@angular/router';

/** Menu Achats (chargé à la demande, réservé à l'Admin : garde posée sur /achats). */
export const ACHATS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'demandes' },
  {
    path: 'demandes/nouvelle',
    loadComponent: () => import('./achats-demande-form.page').then((m) => m.AchatsDemandeFormPage),
  },
  {
    path: ':type',
    loadComponent: () => import('./achats-liste.page').then((m) => m.AchatsListePage),
  },
  {
    path: ':type/:piece',
    loadComponent: () => import('./achats-detail.page').then((m) => m.AchatsDetailPage),
  },
];

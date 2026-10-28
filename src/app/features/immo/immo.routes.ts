import { Routes } from '@angular/router';

/** Module immobilisations (chargé à la demande, réservé à l'Admin : garde posée sur /immo). */
export const IMMO_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./immo-fiches.page').then((m) => m.ImmoFichesPage),
  },
  {
    // Avant « :id », sinon « nouvelle » serait lu comme un identifiant.
    path: 'fiches/nouvelle',
    loadComponent: () => import('./immo-fiche-form.page').then((m) => m.ImmoFicheFormPage),
  },
  {
    path: 'fiches/:id/modifier',
    loadComponent: () => import('./immo-fiche-form.page').then((m) => m.ImmoFicheFormPage),
  },
  {
    path: 'fiches/:id',
    loadComponent: () => import('./immo-fiche-detail.page').then((m) => m.ImmoFicheDetailPage),
  },
  {
    path: 'dotations',
    loadComponent: () => import('./immo-dotations.page').then((m) => m.ImmoDotationsPage),
  },
  {
    path: 'ecritures',
    loadComponent: () => import('./immo-ecritures.page').then((m) => m.ImmoEcrituresPage),
  },
  {
    path: 'etat',
    loadComponent: () => import('./immo-etat.page').then((m) => m.ImmoEtatPage),
  },
  {
    path: 'controles',
    loadComponent: () => import('./immo-controles.page').then((m) => m.ImmoControlesPage),
  },
  {
    path: 'historique',
    loadComponent: () => import('./immo-historique.page').then((m) => m.ImmoHistoriquePage),
  },
  {
    path: 'categories',
    loadComponent: () => import('./immo-categories.page').then((m) => m.ImmoCategoriesPage),
  },
];

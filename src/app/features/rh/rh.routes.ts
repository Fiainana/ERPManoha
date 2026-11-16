import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

/** Rôles du back-office RH. */
const RH = roleGuard('Admin', 'HR');

/**
 * Back-office RH (chargé à la demande). Le planning des repos est visible par tous les comptes ;
 * la présence l'est aussi par le rôle Planning, qui y saisit les pointages manquants.
 */
export const RH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [RH],
    loadComponent: () => import('./rh-tableau-bord.page').then((m) => m.RhTableauBordPage),
  },
  {
    path: 'employes',
    canActivate: [RH],
    loadComponent: () => import('./rh-employes.page').then((m) => m.RhEmployesPage),
  },
  {
    path: 'employes/:id',
    canActivate: [RH],
    loadComponent: () => import('./rh-employe-detail.page').then((m) => m.RhEmployeDetailPage),
  },
  {
    path: 'planning',
    loadComponent: () => import('./rh-planning.page').then((m) => m.RhPlanningPage),
  },
  {
    path: 'absences',
    canActivate: [RH],
    loadComponent: () => import('./rh-absences.page').then((m) => m.RhAbsencesPage),
  },
  {
    path: 'absences/:id',
    canActivate: [RH],
    loadComponent: () => import('./rh-absence-detail.page').then((m) => m.RhAbsenceDetailPage),
  },
  // Mes congés : tout compte ERP (lié à une fiche employé par le RH).
  {
    path: 'mes-conges',
    loadComponent: () => import('./rh-mes-conges.page').then((m) => m.RhMesCongesPage),
  },
  {
    path: 'presence',
    canActivate: [roleGuard('Admin', 'HR', 'Planning')],
    loadComponent: () => import('./rh-presence.page').then((m) => m.RhPresencePage),
  },
  {
    path: 'pointeuse',
    canActivate: [RH],
    loadComponent: () => import('./rh-pointeuse.page').then((m) => m.RhPointeusePage),
  },
  // Paie : salaires, réservée au rôle Admin (comme l'API).
  {
    path: 'paie',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./rh-paie.page').then((m) => m.RhPaiePage),
  },
  {
    path: 'paie/parametres',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./rh-paie-parametres.page').then((m) => m.RhPaieParametresPage),
  },
  {
    path: 'paie/bulletins/:id',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./rh-paie-bulletin.page').then((m) => m.RhPaieBulletinPage),
  },
  {
    path: 'referentiels',
    canActivate: [RH],
    loadComponent: () => import('./rh-referentiels.page').then((m) => m.RhReferentielsPage),
  },
];

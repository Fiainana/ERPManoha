import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

/** Back-office RH (chargé à la demande, rôles HR et Admin : garde posée sur /rh). */
export const RH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./rh-tableau-bord.page').then((m) => m.RhTableauBordPage),
  },
  {
    path: 'employes',
    loadComponent: () => import('./rh-employes.page').then((m) => m.RhEmployesPage),
  },
  {
    path: 'employes/:id',
    loadComponent: () => import('./rh-employe-detail.page').then((m) => m.RhEmployeDetailPage),
  },
  {
    path: 'planning',
    loadComponent: () => import('./rh-planning.page').then((m) => m.RhPlanningPage),
  },
  {
    path: 'absences',
    loadComponent: () => import('./rh-absences.page').then((m) => m.RhAbsencesPage),
  },
  {
    path: 'absences/:id',
    loadComponent: () => import('./rh-absence-detail.page').then((m) => m.RhAbsenceDetailPage),
  },
  {
    path: 'presence',
    loadComponent: () => import('./rh-presence.page').then((m) => m.RhPresencePage),
  },
  {
    path: 'pointeuse',
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
    loadComponent: () => import('./rh-referentiels.page').then((m) => m.RhReferentielsPage),
  },
];

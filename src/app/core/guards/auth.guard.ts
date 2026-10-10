import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppRole } from '../models/api-response';

/** Protège les routes authentifiées. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** Rôles qui ont un tableau de bord commercial / stock sur la page d'accueil. */
const ROLES_ACCUEIL_ERP: AppRole[] = ['Admin', 'Commercial', 'Vendeur', 'Rayon', 'Caisse', 'Depot', 'Recouvrement'];

/** Accueil : un compte uniquement RH arrive directement sur le tableau de bord RH. */
export const accueilGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.roles();
  if (!ROLES_ACCUEIL_ERP.some((r) => roles.includes(r)) && roles.includes('HR')) {
    return router.createUrlTree(['/rh']);
  }
  return true;
};

/**
 * Guard de rôle (ex. Commercial ou Admin).
 * Usage : canActivate: [roleGuard('Commercial', 'Admin')]
 */
export function roleGuard(...roles: AppRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    if (auth.hasRole(...roles)) {
      return true;
    }
    return router.createUrlTree(['/']);
  };
}

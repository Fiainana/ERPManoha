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

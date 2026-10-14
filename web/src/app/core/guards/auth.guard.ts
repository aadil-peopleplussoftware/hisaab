import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. If already authenticated in memory, allow navigation immediately
  if (authService.isAuthenticated() || authService.getAccessToken()) {
    return true;
  }

  // 2. If session check was already performed and failed, redirect to login
  if (authService.isInitialized()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // 3. Initial Hydration (Freshdesk Long-Lived Session):
  // Check httpOnly 30-day refresh cookie silently before booting the user out
  return authService.initSession().pipe(
    map((auth) => {
      if (auth) {
        return true;
      }
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};

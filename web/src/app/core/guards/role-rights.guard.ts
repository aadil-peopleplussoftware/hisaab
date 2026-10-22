import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, of } from 'rxjs';
import { RoleRightsService } from '../services/role-rights.service';

export const roleRightsGuard: CanActivateFn = (route, state) => {
  const roleRightsService = inject(RoleRightsService);
  const router = inject(Router);

  const requiredModule = route.data?.['module'] as string | undefined;

  // If no specific module requirement is attached to the route, allow navigation
  if (!requiredModule) {
    return true;
  }

  // If rights are already cached/loaded, evaluate immediately
  if (roleRightsService.isLoaded()) {
    if (roleRightsService.canView(requiredModule)) {
      return true;
    }
    return router.createUrlTree(['/access-denied'], {
      queryParams: { module: requiredModule, attemptedUrl: state.url }
    });
  }

  // If not loaded yet, fetch rights from server and check
  return roleRightsService.loadMyRights().pipe(
    map(() => {
      if (roleRightsService.canView(requiredModule)) {
        return true;
      }
      return router.createUrlTree(['/access-denied'], {
        queryParams: { module: requiredModule, attemptedUrl: state.url }
      });
    })
  );
};


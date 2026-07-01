import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AccessControlService } from '../services/access-control.service';
import { MatSnackBar } from '@angular/material/snack-bar';

function checkAccess(route: any, state: any) {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const access = inject(AccessControlService);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  return access.ensureLoaded().pipe(
    map(() => canOpen(route, state, auth, access, router)),
    catchError(() => of(canOpen(route, state, auth, access, router)))
  );
}

function canOpen(route: any, state: any, auth: AuthService, access: AccessControlService, router: Router): boolean {
  const requiredRoles: string[] = route.data?.['roles'] ?? [];
  const userRole = auth.currentUser()?.role ?? '';
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(userRole);

  // Determine menuKey: 'my-tasks' is independent of 'all-tasks'
  const menuKey = route.data?.['menuKey'] ?? access.menuKeyFromUrl(state.url);

  // 'my-tasks' should ALWAYS be accessible if the user is authenticated
  // regardless of whether 'all-tasks' is enabled or not
  if (menuKey === 'my-tasks' && hasRequiredRole) {
    return true;
  }

  if (hasRequiredRole && access.isMenuAllowed(userRole, menuKey)) {
    return true;
  }

  // Redirect to dashboard silently instead of showing error
  router.navigate(['/dashboard']);
  return false;
}

export const roleGuard: CanActivateFn = (route, state) => checkAccess(route, state);
export const roleChildGuard: CanActivateChildFn = (route, state) => checkAccess(route, state);

/**
 * Guard for exam create/edit/delete/results routes. Uses the dynamic,
 * Super-Admin-configurable exam permission map instead of a static role list,
 * so granting/revoking exam authoring rights takes effect immediately
 * without needing a code change or redeploy.
 */
export const examManageGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const access = inject(AccessControlService);

  if (!auth.isAuthenticated()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  return access.ensureLoaded().pipe(
    map(() => {
      if (access.canManageExams(auth.currentUser()?.role)) return true;
      router.navigate(['/exams']);
      return false;
    }),
    catchError(() => {
      if (access.canManageExams(auth.currentUser()?.role)) return of(true);
      router.navigate(['/exams']);
      return of(false);
    })
  );
};

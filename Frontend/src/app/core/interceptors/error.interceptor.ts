import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Network error. Please check your connection.';
      } else if (error.error?.message) {
        message = error.error.message;
      } else if (error.status === 403) {
        message = 'Access denied. Insufficient permissions.';
      } else if (error.status === 404) {
        message = 'Resource not found.';
      } else if (error.status === 500) {
        message = 'Server error. Please try again later.';
      }

      // Don't show snackbar for auth endpoints or silent background calls.
      // dashboard/analytics is requested by every authenticated user the
      // moment they land on the dashboard, purely for stat-card numbers;
      // the component already falls back to locally-derived stats on
      // failure, so a transient error here should never surface as a
      // user-facing "Access denied" alert.
      const silentUrls = ['/auth/login', '/auth/refresh', '/auth/logout', '/tasks/my', '/notifications', '/dashboard/analytics'];
      const isSilent = silentUrls.some(u => req.url.includes(u));
      // Also silence 403 on my-tasks since guard handles redirect
      if (!isSilent || (error.status !== 403 && error.status !== 401)) {
        snackBar.open(message, 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }

      return throwError(() => error);
    })
  );
};

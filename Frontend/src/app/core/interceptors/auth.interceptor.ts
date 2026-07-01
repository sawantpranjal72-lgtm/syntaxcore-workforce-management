import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const token = authService.getAccessToken();

  if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Session revoked or expired → force logout
      if (error.status === 401 && !req.url.includes('/auth/')) {
        const errMsg: string = error.error?.message ?? error.error?.error ?? '';
        const isSessionRevoked =
          errMsg.toLowerCase().includes('session') ||
          errMsg.toLowerCase().includes('revoked') ||
          errMsg.toLowerCase().includes('terminated');

        if (isSessionRevoked) {
          // Hard logout - session was revoked server-side
          authService.logout();
          router.navigate(['/auth/login'], {
            queryParams: { reason: 'session_revoked' }
          });
          return throwError(() => error);
        }

        return handle401Error(req, next, authService);
      }

      // 403 with session revoked message
      if (error.status === 403) {
        const errMsg: string = error.error?.message ?? '';
        if (errMsg.toLowerCase().includes('session') && errMsg.toLowerCase().includes('revok')) {
          authService.logout();
          router.navigate(['/auth/login'], { queryParams: { reason: 'session_revoked' } });
          return throwError(() => error);
        }
      }

      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });
}

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      authService.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return authService.refreshToken(refreshToken).pipe(
      switchMap(response => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        return next(addToken(req, response.accessToken));
      }),
      catchError(err => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(addToken(req, token!)))
  );
}

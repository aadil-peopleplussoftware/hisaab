import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Global refresh state mutex
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Do not attempt refresh on auth endpoints to avoid infinite loops
        const isAuthEndpoint =
          req.url.includes('/api/v1/auth/login') ||
          req.url.includes('/api/v1/auth/refresh') ||
          req.url.includes('/api/v1/auth/logout') ||
          req.url.includes('/api/v1/auth/register');

        if (isAuthEndpoint) {
          authService.clearSession();
          router.navigate(['/auth/login']);
          return throwError(() => error);
        }

        // =========================================================================
        // SILENT REFRESH FLOW (OAuth2 / Freshdesk Architecture)
        // If 401 occurs on protected data API: pause pending requests, rotate token,
        // and retry seamlessly with zero user interruption or UI flicker.
        // =========================================================================
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((authResponse) => {
              isRefreshing = false;
              refreshTokenSubject.next(authResponse.accessToken);

              // Retry original failed request with the new access token
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${authResponse.accessToken}`
                },
                withCredentials: true
              });

              return next(retryReq);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authService.clearSession();
              router.navigate(['/auth/login']);
              return throwError(() => refreshErr);
            })
          );
        } else {
          // If a refresh is already underway, wait until new token is emitted and retry
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`
                },
                withCredentials: true
              });

              return next(retryReq);
            })
          );
        }
      }

      const errorMessage = error.error?.detail || error.error?.title || error.message || 'An unexpected error occurred.';
      console.error(`[API Error ${error.status}]:`, errorMessage, error);

      return throwError(() => error);
    })
  );
};

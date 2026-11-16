import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Préfixe des appels API. Angular et l'API sont servis sur le même site (proxy en dev, reverse proxy en prod). URL relatives : fonctionne sous tout base href (/ ou /absproxy/4210/).. */
export const API_PREFIX = 'api/';

/**
 * - n'envoie les credentials (cookie de session) qu'à l'API, jamais à un domaine tiers ;
 * - sur 401 d'une route protégée (admin, espace membre : session expirée), renvoie vers la connexion.
 * Aucun jeton n'est lu ni stocké côté client : l'authentification repose sur le cookie HttpOnly.
 */
/** Routes réservées aux personnes connectées. */
const PROTECTED = [`${API_PREFIX}admin/`, `${API_PREFIX}member/`];

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) {
    return next(req);
  }

  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        PROTECTED.some((p) => req.url.startsWith(p))
      ) {
        auth.forget();
        void router.navigate(['/connexion'], { queryParams: { retour: router.url } });
      }
      return throwError(() => error);
    }),
  );
};

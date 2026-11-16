import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Guards d'ERGONOMIE uniquement : ils évitent d'afficher un écran inutilisable.
 * Ils ne protègent rien — chaque endpoint est protégé côté Symfony (access_control + rôles).
 */
function requireRole(check: (auth: AuthService) => boolean, fallback: string): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user$: Observable<unknown> = auth.isAuthenticated()
      ? of(auth.currentUser())
      : auth.refresh();

    return user$.pipe(
      map((user) => {
        if (!user) {
          return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
        }
        return check(auth) ? true : router.createUrlTree([fallback]);
      }),
    );
  };
}

export const memberGuard = requireRole((auth) => auth.isMember(), '/');
export const editorGuard = requireRole((auth) => auth.isEditor(), '/');
export const adminGuard = requireRole((auth) => auth.isAdmin(), '/admin');

/** Adresse de retour après connexion : chemin interne uniquement (pas de redirection ouverte). */
export function safeReturnUrl(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : null;
}

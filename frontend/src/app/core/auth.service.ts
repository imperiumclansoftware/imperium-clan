import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { Member } from './api/models';

export interface CurrentUser {
  readonly id: string; // UUID opaque : ni généré ni interprété côté client
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  /** Fiche membre reliée au compte (pseudo, branches), null si aucune. */
  readonly member: Member | null;
}

/**
 * État d'authentification en mémoire uniquement (signal).
 * Jamais de jeton ni de donnée personnelle dans localStorage / sessionStorage.
 * Les rôles servent à adapter l'interface ; l'API les vérifie à chaque requête.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<CurrentUser | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.roles.includes('ROLE_ADMIN') ?? false);
  readonly isEditor = computed(
    () => this.isAdmin() || (this.user()?.roles.includes('ROLE_EDITOR') ?? false),
  );
  readonly isMember = computed(
    () => this.isEditor() || (this.user()?.roles.includes('ROLE_MEMBER') ?? false),
  );

  /** Recharge la session (cookie HttpOnly). Route publique : un visiteur reçoit `user: null`, pas un 401. */
  refresh(): Observable<CurrentUser | null> {
    return this.http.get<{ user: CurrentUser | null }>('api/session').pipe(
      map((r) => r.user),
      catchError(() => of(null)),
      tap((user) => this.user.set(user)),
    );
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http
      .post<CurrentUser>('api/login', { email, password })
      .pipe(tap((user) => this.user.set(user)));
  }

  logout(): Observable<void> {
    return this.http.post<null>('api/logout', null).pipe(
      map(() => undefined),
      tap(() => this.user.set(null)),
    );
  }

  /** Session expirée côté serveur : on oublie l'utilisateur sans appel réseau. */
  forget(): void {
    this.user.set(null);
  }
}

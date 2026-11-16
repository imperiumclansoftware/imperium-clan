import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface SetupInput {
  readonly token: string;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

/** Installation d'une instance neuve : création du premier administrateur. */
@Injectable({ providedIn: 'root' })
export class SetupApi {
  private readonly http = inject(HttpClient);

  /** true tant qu'aucun compte n'existe. En cas d'erreur, on considère le site installé. */
  required(): Observable<boolean> {
    return this.http.get<{ required: boolean }>('api/setup').pipe(
      map((r) => r.required),
      catchError(() => of(false)),
    );
  }

  install(input: SetupInput): Observable<void> {
    return this.http.post<unknown>('api/setup', input).pipe(map(() => undefined));
  }
}

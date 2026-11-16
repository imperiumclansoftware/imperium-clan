import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of } from 'rxjs';

export type Remote<T> =
  | { readonly state: 'loading' }
  | { readonly state: 'error' }
  | { readonly state: 'ok'; readonly value: T };

/** Données chargées une fois, exposées en signal avec leurs états de chargement et d'erreur. */
export function remote<T>(source: Observable<T>): Signal<Remote<T>> {
  return toSignal(
    source.pipe(
      map((value): Remote<T> => ({ state: 'ok', value })),
      catchError(() => of<Remote<T>>({ state: 'error' })),
    ),
    { initialValue: { state: 'loading' } as Remote<T> },
  );
}

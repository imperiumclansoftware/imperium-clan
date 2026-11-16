import { HttpErrorResponse } from '@angular/common/http';

interface Violation {
  readonly propertyPath?: string;
  readonly title?: string;
}

/** Message lisible à partir d'une erreur API (problem+json, violations de validation Symfony). */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue, réessaie.',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  const body: unknown = error.error;
  if (body && typeof body === 'object') {
    const violations = (body as { violations?: Violation[] }).violations;
    if (Array.isArray(violations) && violations.length > 0) {
      return violations
        .map((v) => v.title ?? '')
        .filter(Boolean)
        .join(' ');
    }
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail !== '' && error.status < 500) {
      return detail;
    }
  }
  if (error.status === 403) {
    return 'Tu n’as pas les droits pour cette action.';
  }
  if (error.status === 429) {
    return 'Trop de tentatives, réessaie plus tard.';
  }
  return fallback;
}

/** Date ISO 8601 (DATE_ATOM attendu par Symfony) depuis la valeur d'un champ datetime-local. */
export function localInputToAtom(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

/** Valeur d'un champ datetime-local (heure locale) depuis une date ISO. */
export function atomToLocalInput(value: string | null): string {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

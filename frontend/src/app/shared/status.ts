import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** États de chargement et d'erreur uniformes. */
@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state() === 'loading') {
      <p class="secondaire" role="status">Chargement…</p>
    } @else if (state() === 'error') {
      <p class="erreur" role="alert">
        Impossible de charger le contenu pour le moment. Réessaie dans un instant.
      </p>
    } @else if (empty()) {
      <p class="secondaire">{{ emptyText() }}</p>
    }
  `,
})
export class Status {
  readonly state = input.required<'loading' | 'error' | 'ok'>();
  readonly empty = input(false);
  readonly emptyText = input('Rien à afficher pour l’instant.');
}

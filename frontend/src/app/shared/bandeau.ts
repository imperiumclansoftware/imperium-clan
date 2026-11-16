import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bandeau signature : les 4 couleurs des branches dans l'ordre ICG, ICF, ICC, ICS. */
@Component({
  selector: 'app-bandeau',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bandeau" aria-hidden="true">
    <span class="icg"></span><span class="icf"></span><span class="icc"></span
    ><span class="ics"></span>
  </div>`,
})
export class Bandeau {}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRANCHES, BranchCode } from '../core/branches';

/** Pastilles de branche : rond de couleur + sigle (la couleur n'est jamais le seul indice). */
@Component({
  selector: 'app-branch-pills',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="ligne" role="list" aria-label="Branches">
      @for (b of list(); track b.code) {
        <li class="pastille" [style.--pastille]="b.color" [attr.title]="b.name">
          {{ format() === 'moyen' ? b.code + ' · ' + b.short : b.code }}
          <span class="visually-hidden">{{ b.name }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      gap: var(--imp-e-2);
    }
  `,
})
export class BranchPills {
  readonly branches = input.required<readonly BranchCode[]>();
  readonly format = input<'etroit' | 'moyen'>('etroit');

  /** Ordre officiel ICG, ICF, ICC, ICS quel que soit l'ordre reçu. */
  protected readonly list = computed(() =>
    BRANCHES.filter((b) => this.branches().includes(b.code)),
  );
}

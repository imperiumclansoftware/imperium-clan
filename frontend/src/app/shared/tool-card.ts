import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tool } from '../core/api/models';
import { BranchPills } from './branch-pills';

@Component({
  selector: 'app-tool-card',
  imports: [BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte outil">
      <div class="ligne entre">
        <h3>{{ tool().name }}</h3>
        <app-branch-pills [branches]="tool().branches" />
      </div>
      <p class="secondaire">{{ tool().description }}</p>
      <p class="code secondaire">{{ host() }}</p>
      <a class="btn btn-secondaire" [href]="tool().url" target="_blank" rel="noopener noreferrer">
        Ouvrir {{ tool().name }}<span class="visually-hidden"> (nouvel onglet)</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </a>
    </article>
  `,
  styles: `
    .entre {
      justify-content: space-between;
    }
    h3 {
      font-size: var(--imp-taille-l);
    }
    .btn {
      justify-self: start;
    }
  `,
})
export class ToolCard {
  readonly tool = input.required<Tool>();

  protected host(): string {
    try {
      return new URL(this.tool().url).host;
    } catch {
      return '';
    }
  }
}

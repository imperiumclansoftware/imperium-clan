import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PublicApi } from '../../core/api/public-api';
import { BRANCHES } from '../../core/branches';
import { remote } from '../../shared/remote';
import { Sceau } from '../../shared/sceau';
import { Status } from '../../shared/status';
import { ToolCard } from '../../shared/tool-card';

@Component({
  selector: 'app-tools',
  imports: [Sceau, Status, ToolCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Outils du clan</p>
        <h1>Nos quartiers, branche par branche</h1>
        <p class="secondaire">
          Un outil peut servir plusieurs branches : il apparaît alors dans chacune.
        </p>
      </header>

      @let t = tools();
      <app-status [state]="t.state" [empty]="t.state === 'ok' && t.value.length === 0" />
      @for (group of groups(); track group.branch.code) {
        <section class="section" [attr.aria-labelledby]="'branche-' + group.branch.code">
          <div class="ligne">
            <app-sceau [branches]="[group.branch.code]" [size]="48" [decorative]="true" />
            <div>
              <p class="libelle">{{ group.branch.code }}</p>
              <h2 class="gothique" [id]="'branche-' + group.branch.code">
                {{ group.branch.name }}
              </h2>
            </div>
          </div>
          @if (group.tools.length) {
            <div class="grille-l">
              @for (tool of group.tools; track tool.id) {
                <app-tool-card [tool]="tool" />
              }
            </div>
          } @else {
            <p class="secondaire">Pas encore d’outil dédié à cette branche.</p>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .section {
      padding-block: var(--imp-e-6);
      border-top: 1px solid var(--imp-trait);
    }
  `,
})
export class Tools {
  protected readonly tools = remote(inject(PublicApi).tools());

  protected readonly groups = computed(() => {
    const t = this.tools();
    if (t.state !== 'ok' || t.value.length === 0) {
      return [];
    }
    return BRANCHES.map((branch) => ({
      branch,
      tools: t.value.filter((tool) => tool.branches.includes(branch.code)),
    }));
  });
}

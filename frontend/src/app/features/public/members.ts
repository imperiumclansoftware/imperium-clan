import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { BRANCHES, BRANCH_CODES, BranchCode } from '../../core/branches';
import { BranchPills } from '../../shared/branch-pills';
import { remote } from '../../shared/remote';
import { rankLabel } from '../../core/ranks';
import { Sceau } from '../../shared/sceau';
import { Status } from '../../shared/status';

@Component({
  selector: 'app-members',
  imports: [BranchPills, Sceau, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Membres du clan</p>
        <h1>Ceux qui portent le sceau</h1>
        <p class="secondaire">Chaque sceau allume les arcs des branches de son membre.</p>
      </header>

      <form class="filtres carte" role="search" (submit)="$event.preventDefault()">
        <div class="champ recherche">
          <label for="recherche">Rechercher un membre</label>
          <input
            id="recherche"
            type="search"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            autocomplete="off"
          />
        </div>
        <fieldset class="champ">
          <legend>Filtrer par branche</legend>
          <div class="ligne">
            @for (b of branchInfos; track b.code) {
              <label class="case">
                <input
                  type="checkbox"
                  [checked]="selected().includes(b.code)"
                  (change)="toggle(b.code)"
                />
                <span class="pastille" [style.--pastille]="b.color">{{ b.code }}</span>
                <span>{{ b.short }}</span>
              </label>
            }
          </div>
        </fieldset>
      </form>

      @let m = members();
      <app-status
        [state]="m.state"
        [empty]="m.state === 'ok' && m.value.length === 0"
        emptyText="Aucun membre n’est encore affiché sur le portail."
      />
      @if (m.state === 'ok' && m.value.length) {
        <p class="secondaire compte" role="status">
          {{ filtered().length }} membre{{ filtered().length > 1 ? 's' : '' }}
        </p>
        <ul class="grille liste" role="list">
          @for (member of filtered(); track member.id) {
            <li class="carte membre">
              <div class="identite">
                <app-sceau
                  [branches]="member.branches"
                  [size]="88"
                  [avatar]="member.avatarUrl"
                  [decorative]="true"
                />
                <div class="pile nom">
                  <h2>{{ member.pseudo }}</h2>
                  <span class="grade" [attr.data-grade]="member.rank">{{
                    rankLabel(member.rank)
                  }}</span>
                  @if (member.title) {
                    <p class="libelle">{{ member.title }}</p>
                  }
                </div>
              </div>
              <app-branch-pills [branches]="member.branches" />
              @if (member.bio) {
                <p class="secondaire bio">{{ member.bio }}</p>
              }
            </li>
          } @empty {
            <li class="secondaire">Aucun membre ne correspond à ces filtres.</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .filtres {
      margin-bottom: var(--imp-e-5);
      gap: var(--imp-e-4);
    }
    .recherche {
      max-width: 420px;
    }
    .compte {
      margin-bottom: var(--imp-e-3);
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .membre {
      gap: var(--imp-e-4);
    }
    .identite {
      display: flex;
      align-items: center;
      gap: var(--imp-e-4);
    }
    .nom {
      gap: var(--imp-e-1);
      min-width: 0;
    }
    .nom h2 {
      overflow-wrap: anywhere;
    }
    h2 {
      font-size: var(--imp-taille-l);
    }
    .bio {
      font-size: var(--imp-taille-s);
    }
  `,
})
export class Members {
  protected readonly rankLabel = rankLabel;
  private readonly router = inject(Router);

  /** Filtre partagé dans l'URL : ?branches=ICG,ICS (plusieurs branches possibles). */
  readonly branches = input<string | undefined>();

  protected readonly branchInfos = BRANCHES;
  protected readonly members = remote(inject(PublicApi).members());
  protected readonly query = signal('');

  protected readonly selected = computed<BranchCode[]>(() => {
    const raw = (this.branches() ?? '').split(',');
    return BRANCH_CODES.filter((c) => raw.includes(c));
  });

  protected readonly filtered = computed(() => {
    const m = this.members();
    if (m.state !== 'ok') {
      return [];
    }
    const selected = this.selected();
    const q = this.query().trim().toLocaleLowerCase('fr');
    return m.value.filter(
      (member) =>
        (selected.length === 0 || member.branches.some((b) => selected.includes(b))) &&
        (q === '' || member.pseudo.toLocaleLowerCase('fr').includes(q)),
    );
  });

  protected toggle(code: BranchCode): void {
    const set = new Set(this.selected());
    if (set.has(code)) {
      set.delete(code);
    } else {
      set.add(code);
    }
    const value = BRANCH_CODES.filter((c) => set.has(c)).join(',');
    void this.router.navigate([], { queryParams: { branches: value || null }, replaceUrl: true });
  }
}

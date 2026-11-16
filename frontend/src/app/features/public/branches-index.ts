import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { backgroundUrl } from '../../core/backgrounds';
import { BRANCHES } from '../../core/branches';
import { remote } from '../../shared/remote';
import { Sceau } from '../../shared/sceau';

@Component({
  selector: 'app-branches-index',
  imports: [RouterLink, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Les branches</p>
        <h1>Quatre voies, un sceau</h1>
        <p class="secondaire">
          Chaque branche a sa zone, à ses couleurs. Et chacun peut en rejoindre plusieurs.
        </p>
      </header>
      <ul class="grille liste" role="list">
        @for (b of cards(); track b.code) {
          <li>
            <a
              class="carte branche"
              [routerLink]="['/branches', b.code.toLowerCase()]"
              [style.--couleur]="b.color"
            >
              <img
                class="vignette"
                [src]="b.thumb"
                alt=""
                width="640"
                height="272"
                loading="lazy"
              />
              <app-sceau [branches]="[b.code]" [size]="96" [decorative]="true" />
              <p class="sigle">{{ b.code }}</p>
              <h2>{{ b.name }}</h2>
              <p class="secondaire">{{ b.intro }}</p>
              <span class="entrer">Entrer dans la zone →</span>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .vignette {
      width: calc(100% + 2 * var(--imp-e-5));
      max-width: none;
      height: auto;
      aspect-ratio: 1584 / 672;
      object-fit: cover;
      margin: calc(-1 * var(--imp-e-5)) calc(-1 * var(--imp-e-5)) 0;
      border-radius: var(--imp-rayon-l) var(--imp-rayon-l) 0 0;
    }
    .branche app-sceau {
      margin-top: -48px;
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .branche {
      height: 100%;
      gap: var(--imp-e-3);
      transition:
        border-color 0.3s,
        background-color 0.3s;
    }
    .branche:hover,
    .branche:focus-visible {
      border-color: var(--couleur);
    }
    .sigle {
      color: var(--couleur);
      font-size: var(--imp-taille-xs);
      font-weight: 700;
      letter-spacing: 0.16em;
    }
    h2 {
      font-size: var(--imp-taille-l);
    }
    .entrer {
      color: var(--couleur);
      font-weight: 600;
      margin-top: auto;
    }
  `,
})
export class BranchesIndex {
  private readonly profiles = remote(inject(PublicApi).branches());

  protected readonly cards = computed(() => {
    const p = this.profiles();
    return BRANCHES.map((b) => ({
      ...b,
      thumb: backgroundUrl(b.code, 'small'),
      intro: (p.state === 'ok' ? p.value.find((x) => x.code === b.code)?.intro : null) ?? b.tagline,
    }));
  });
}

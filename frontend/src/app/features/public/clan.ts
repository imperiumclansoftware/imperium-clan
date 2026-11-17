import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { BRANCHES } from '../../core/branches';
import { RichText } from '../../shared/rich-text';
import { remote } from '../../shared/remote';
import { Sceau } from '../../shared/sceau';
import { Status } from '../../shared/status';

@Component({
  selector: 'app-clan',
  imports: [RouterLink, RichText, Sceau, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Le clan</p>
        <h1>L’Imperium</h1>
      </header>

      @let p = pages();
      <app-status [state]="p.state" [empty]="p.state === 'ok' && p.value.length === 0" />
      @if (p.state === 'ok' && p.value.length) {
        <div class="disposition">
          <nav aria-label="Sommaire" class="sommaire">
            <p class="libelle">Sommaire</p>
            <ul role="list">
              @for (page of p.value; track page.id) {
                <li>
                  <a [href]="'#' + page.slug">{{ page.title }}</a>
                </li>
              }
            </ul>
          </nav>
          <div class="pile sections">
            @for (page of p.value; track page.id) {
              <section class="carte" [id]="page.slug" [attr.aria-labelledby]="'titre-' + page.slug">
                <h2 class="gothique" [id]="'titre-' + page.slug">{{ page.title }}</h2>
                <app-rich-text [doc]="page.content" />
              </section>
            }
          </div>
        </div>
      }

      <section class="section" aria-labelledby="titre-branches">
        <h2 class="gothique" id="titre-branches">Les branches</h2>
        <div class="grille">
          @for (b of branches; track b.code) {
            <a class="carte branche" [routerLink]="['/branches', b.code.toLowerCase()]">
              <app-sceau [branches]="[b.code]" [size]="56" [decorative]="true" />
              <div class="pile">
                <h3>{{ b.code }} · {{ b.short }}</h3>
                <p class="secondaire">{{ b.tagline }}</p>
              </div>
            </a>
          }
        </div>
        <p class="secondaire">
          Un membre peut appartenir à plusieurs branches : son sceau allume l’arc de chacune.
        </p>
        <a routerLink="/rejoindre" class="btn btn-principal rejoindre">Rejoindre l’Imperium</a>
      </section>
    </div>
  `,
  styles: `
    .disposition {
      display: grid;
      gap: var(--imp-e-5);
    }
    @media (min-width: 900px) {
      .disposition {
        grid-template-columns: 220px 1fr;
        align-items: start;
      }
      .sommaire {
        position: sticky;
        top: 100px;
      }
    }
    .sommaire ul {
      list-style: none;
      margin: var(--imp-e-3) 0 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-1);
    }
    .sommaire a {
      display: flex;
      min-height: 44px;
      align-items: center;
      color: var(--imp-gris-sombre);
      text-decoration: none;
    }
    .sommaire a:hover {
      color: var(--imp-ivoire);
    }
    .sections {
      gap: var(--imp-e-4);
    }
    .sections .carte {
      gap: var(--imp-e-4);
      scroll-margin-top: 100px;
    }
    .branche {
      grid-template-columns: auto 1fr;
      gap: var(--imp-e-4);
    }
    .rejoindre {
      justify-self: start;
    }
  `,
})
export class Clan {
  protected readonly branches = BRANCHES;
  protected readonly pages = remote(inject(PublicApi).pages());
}

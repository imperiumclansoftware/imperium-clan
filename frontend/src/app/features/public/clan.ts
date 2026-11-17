import { ChangeDetectionStrategy, Component, afterRenderEffect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
                  <a
                    routerLink="."
                    [fragment]="page.slug"
                    [class.actif]="fragment() === page.slug"
                    [attr.aria-current]="fragment() === page.slug ? 'location' : null"
                    (click)="onLink(page.slug)"
                    >{{ page.title }}</a
                  >
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
    .sommaire a:hover,
    .sommaire a.actif {
      color: var(--imp-ivoire);
    }
    .sommaire a.actif {
      font-weight: 600;
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
  /** Section visée par l'adresse (/le-clan#reglement), mise en avant dans le sommaire */
  protected readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  constructor() {
    // Lien direct vers une section : les sections arrivent après la navigation, on défile une fois
    // qu'elles sont affichées (le défilement automatique du routeur a eu lieu trop tôt).
    afterRenderEffect(() => {
      const fragment = this.fragment();
      if (this.pages().state === 'ok' && fragment && !this.scrolledTo) {
        this.scrolledTo = fragment;
        this.goTo(fragment);
      }
    });
  }

  private scrolledTo: string | null = null;

  /**
   * Clic dans le sommaire : le routeur (routerLink + fragment, anchorScrolling) défile vers une NOUVELLE
   * section ; un second clic sur la section déjà visée serait ignoré par lui, on défile alors ici.
   */
  protected onLink(slug: string): void {
    if (this.fragment() === slug) {
      this.goTo(slug);
    }
  }

  /** Défile jusqu'à la section (marge prévue pour l'en-tête collant : scroll-margin-top). */
  private goTo(slug: string): void {
    this.scrolledTo = slug;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      document
        .getElementById(slug)
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    );
  }
}

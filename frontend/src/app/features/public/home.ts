import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { BRANCHES } from '../../core/branches';
import { NewsCard } from '../../shared/news-card';
import { remote } from '../../shared/remote';
import { Sceau } from '../../shared/sceau';
import { Status } from '../../shared/status';
import { ToolCard } from '../../shared/tool-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Sceau, NewsCard, ToolCard, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="conteneur hero-grille">
        <app-sceau
          [size]="300"
          class="hero-sceau"
          title="Sceau du clan Imperium : les quatre branches"
        />
        <div class="pile hero-texte">
          <p class="libelle">Clan Imperium</p>
          <h1>Jouer, regarder, raconter, coder.</h1>
          <p class="accroche secondaire">
            Quatre branches, un seul clan — et chacun peut en rejoindre plusieurs.
          </p>
          <div class="ligne">
            <a routerLink="/rejoindre" class="btn btn-principal">Rejoindre le clan</a>
            <a routerLink="/membres" class="btn btn-secondaire">Découvrir les membres</a>
          </div>
        </div>
      </div>
    </section>

    <section class="conteneur section" aria-labelledby="titre-branches">
      <div class="section-entete">
        <p class="libelle">Nos branches</p>
        <h2 class="gothique" id="titre-branches">Quatre voies, un sceau</h2>
      </div>
      <div class="grille">
        @for (b of branches; track b.code) {
          <a class="carte branche" [routerLink]="['/branches', b.code.toLowerCase()]">
            <app-sceau [branches]="[b.code]" [size]="64" [decorative]="true" />
            <div class="pile">
              <p class="sigle" [style.color]="b.color">{{ b.code }}</p>
              <h3>{{ b.name }}</h3>
              <p class="secondaire">{{ b.tagline }}</p>
            </div>
          </a>
        }
      </div>
    </section>

    <section class="conteneur section" aria-labelledby="titre-outils">
      <div class="section-entete">
        <p class="libelle">Les outils du clan</p>
        <h2 class="gothique" id="titre-outils">Nos quartiers</h2>
      </div>
      @let t = tools();
      <app-status [state]="t.state" [empty]="t.state === 'ok' && t.value.length === 0" />
      @if (t.state === 'ok') {
        <div class="grille-l">
          @for (tool of t.value; track tool.id) {
            <app-tool-card [tool]="tool" />
          }
        </div>
        <a routerLink="/outils" class="btn btn-secondaire voir-tout">Tous les outils par branche</a>
      }
    </section>

    <section class="conteneur section" aria-labelledby="titre-actus">
      <div class="section-entete">
        <p class="libelle">Actualités</p>
        <h2 class="gothique" id="titre-actus">Les dernières nouvelles</h2>
      </div>
      @let n = news();
      <app-status
        [state]="n.state"
        [empty]="n.state === 'ok' && n.value.length === 0"
        emptyText="Pas encore d’actualité publiée."
      />
      @if (n.state === 'ok' && n.value.length) {
        <div class="grille-l">
          @for (item of n.value; track item.id) {
            <app-news-card [news]="item" />
          }
        </div>
        <a routerLink="/actualites" class="btn btn-secondaire voir-tout">Toutes les actualités</a>
      }
    </section>
  `,
  styles: `
    .hero-grille {
      position: relative;
      z-index: 1;
    }
    .hero {
      position: relative;
      overflow: hidden;
      padding: var(--imp-e-8) 0;
      border-bottom: 1px solid var(--imp-trait);
    }
    .hero-grille {
      display: grid;
      gap: var(--imp-e-7);
      align-items: center;
      justify-items: center;
      text-align: center;
    }
    .hero-texte {
      gap: var(--imp-e-5);
      justify-items: center;
    }
    .hero-texte .ligne {
      justify-content: center;
    }
    .hero-sceau {
      width: min(300px, 70vw);
    }
    .hero-sceau ::ng-deep svg {
      width: 100%;
      height: auto;
    }
    h1 {
      font-size: clamp(2.5rem, 7vw, var(--imp-taille-titre-l));
    }
    .accroche {
      font-size: var(--imp-taille-l);
      max-width: 40ch;
    }
    @media (min-width: 900px) {
      .hero-grille {
        grid-template-columns: auto 1fr;
        justify-items: start;
        text-align: left;
      }
      .hero-texte {
        justify-items: start;
      }
      .hero-texte .ligne {
        justify-content: flex-start;
      }
    }
    .branche {
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: var(--imp-e-4);
    }
    .sigle {
      font-size: var(--imp-taille-xs);
      font-weight: 700;
      letter-spacing: 0.16em;
    }
    .voir-tout {
      justify-self: start;
    }
  `,
})
export class Home {
  private readonly api = inject(PublicApi);

  protected readonly branches = BRANCHES;
  protected readonly tools = remote(this.api.tools());
  protected readonly news = remote(this.api.news(1, 3));
}

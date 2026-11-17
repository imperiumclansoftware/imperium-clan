import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { NewsSummary } from '../../core/api/models';
import { PublicApi } from '../../core/api/public-api';
import { backgroundUrl } from '../../core/backgrounds';
import { BranchTheme } from '../../core/branch-theme';
import { BRANCHES, BranchCode, BranchInfo } from '../../core/branches';
import { NewsCard } from '../../shared/news-card';
import { RichText } from '../../shared/rich-text';
import { isRichEmpty } from '../../core/rich';
import { remote } from '../../shared/remote';
import { rankLabel } from '../../core/ranks';
import { Sceau } from '../../shared/sceau';
import { ToolCard } from '../../shared/tool-card';

/**
 * Zone d'une branche (/branches/icg…) : l'interface prend la couleur de la branche (transition animée,
 * BranchTheme + styles.scss) et le contenu est filtré sur elle.
 */
@Component({
  selector: 'app-branch-zone',
  imports: [RouterLink, RouterLinkActive, Sceau, ToolCard, NewsCard, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Fonds des branches superposés : celui de la branche active apparaît en fondu (même durée que la couleur). -->
    <div class="fonds" aria-hidden="true">
      @for (b of branches; track b.code) {
        <img [src]="fond(b.code)" alt="" [class.visible]="b.code === branch()?.code" />
      }
    </div>
    <div class="conteneur">
      <nav class="selecteur" aria-label="Changer de branche">
        <ul role="list">
          @for (b of branches; track b.code) {
            <li>
              <a
                [routerLink]="['/branches', b.code.toLowerCase()]"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                class="onglet"
                [style.--pastille]="b.color"
              >
                <span class="point" aria-hidden="true"></span>{{ b.code
                }}<span class="nom-court"> · {{ b.short }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      @if (branch(); as b) {
        <section class="hero" [attr.aria-labelledby]="'titre-' + b.code">
          <app-sceau
            [branches]="[b.code]"
            [size]="240"
            class="hero-sceau"
            [title]="'Sceau de la branche ' + b.name"
          />
          <div class="pile hero-texte">
            <p class="libelle accent">Branche {{ b.code }}</p>
            <h1 [id]="'titre-' + b.code">{{ b.name }}</h1>
            <p class="intro">{{ profile()?.intro ?? b.tagline }}</p>
            <div class="ligne">
              <a
                routerLink="/rejoindre"
                [queryParams]="{ branches: b.code }"
                class="btn btn-principal"
                >Rejoindre la branche</a
              >
              <a
                routerLink="/membres"
                [queryParams]="{ branches: b.code }"
                class="btn btn-secondaire"
                >Tous ses membres</a
              >
            </div>
          </div>
        </section>

        @if (profile(); as pr) {
          @if (!isEmpty(pr.content)) {
            <section class="section texte-branche" aria-label="Présentation">
              <app-rich-text [doc]="pr.content" />
            </section>
          }
        }

        <section class="section" aria-labelledby="titre-membres">
          <div class="section-entete">
            <p class="libelle accent">Membres</p>
            <h2 class="gothique" id="titre-membres">Ils portent l’arc {{ b.short }}</h2>
          </div>
          @if (members().length) {
            <ul class="grille membres" role="list">
              @for (m of members(); track m.id) {
                <li class="carte membre">
                  <app-sceau
                    [branches]="m.branches"
                    [size]="56"
                    [avatar]="m.avatarUrl"
                    [decorative]="true"
                  />
                  <div class="pile nom">
                    <p class="pseudo">{{ m.pseudo }}</p>
                    <span class="grade" [attr.data-grade]="m.rank">{{ rankLabel(m.rank) }}</span>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <p class="secondaire">Pas encore de membre affiché dans cette branche.</p>
          }
        </section>

        <section class="section" aria-labelledby="titre-outils">
          <div class="section-entete">
            <p class="libelle accent">Outils</p>
            <h2 class="gothique" id="titre-outils">Les quartiers de la branche</h2>
          </div>
          @if (tools().length) {
            <div class="grille-l">
              @for (tool of tools(); track tool.id) {
                <app-tool-card [tool]="tool" />
              }
            </div>
          } @else {
            <p class="secondaire">Pas encore d’outil dédié à cette branche.</p>
          }
        </section>

        <section class="section" aria-labelledby="titre-actus">
          <div class="section-entete">
            <p class="libelle accent">Actualités</p>
            <h2 class="gothique" id="titre-actus">Les nouvelles de la branche</h2>
          </div>
          @if (news().length) {
            <div class="grille-l">
              @for (item of news(); track item.id) {
                <app-news-card [news]="item" />
              }
            </div>
          } @else {
            <p class="secondaire">Pas encore d’actualité pour cette branche.</p>
          }
        </section>
      } @else {
        <section class="hero">
          <div class="pile">
            <h1>Branche introuvable</h1>
            <p class="secondaire">Choisis l’une des quatre branches ci-dessus.</p>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .fonds {
      position: absolute;
      inset: 0 0 auto 0;
      height: clamp(560px, 46vw, 720px);
      overflow: hidden;
      pointer-events: none;
    }
    .fonds img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.7s ease;
    }
    .fonds img.visible {
      opacity: 1;
    }
    /* Voile : garantit la lisibilité du texte et fond l'image dans la page. */
    .fonds::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgb(14 14 16 / 0.3),
        rgb(14 14 16 / 0.55) 55%,
        var(--imp-noir)
      );
    }
    .conteneur {
      position: relative;
    }
    .selecteur {
      padding-top: var(--imp-e-6);
    }
    .selecteur ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--imp-e-2);
    }
    .onglet {
      display: inline-flex;
      align-items: center;
      gap: var(--imp-e-2);
      min-height: 44px;
      padding: 0 var(--imp-e-4);
      border: 1px solid var(--imp-trait-fort);
      border-radius: var(--imp-rayon-pastille);
      text-decoration: none;
      font-weight: 700;
      font-size: var(--imp-taille-s);
      letter-spacing: 0.06em;
      color: var(--imp-gris-sombre);
      transition:
        color 0.3s,
        border-color 0.3s,
        background-color 0.3s;
    }
    .onglet:hover {
      color: var(--imp-ivoire);
      border-color: var(--pastille);
    }
    .onglet.active {
      color: var(--imp-noir);
      background: var(--pastille);
      border-color: var(--pastille);
    }
    .point {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--pastille);
    }
    .onglet.active .point {
      background: var(--imp-noir);
    }
    .nom-court {
      font-weight: 500;
      letter-spacing: 0;
    }
    @media (max-width: 560px) {
      .nom-court {
        display: none;
      }
    }

    .hero {
      display: grid;
      gap: var(--imp-e-6);
      align-items: center;
      padding: var(--imp-e-7) 0;
      border-bottom: 1px solid var(--imp-trait);
    }
    @media (min-width: 900px) {
      .hero {
        grid-template-columns: auto 1fr;
      }
    }
    .hero-sceau {
      width: min(240px, 60vw);
    }
    .hero-sceau ::ng-deep svg {
      width: 100%;
      height: auto;
    }
    .hero-texte {
      gap: var(--imp-e-4);
    }
    .intro {
      font-size: var(--imp-taille-l);
      color: var(--imp-gris-sombre);
      max-width: 46ch;
    }
    .texte-branche {
      border-bottom: 1px solid var(--imp-trait);
    }

    .membres {
      list-style: none;
      margin: 0;
      padding: 0;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
    }
    .membre {
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--imp-e-3);
      padding: var(--imp-e-4);
    }
    .pseudo {
      font-weight: 600;
    }
    .nom {
      gap: var(--imp-e-1);
      justify-items: start;
    }

    /* Entrée dans une zone : le contenu glisse légèrement pendant que la couleur change. */
    .hero-texte,
    .section {
      animation: apparition 0.5s ease both;
    }
    @keyframes apparition {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class BranchZone implements OnDestroy {
  private readonly api = inject(PublicApi);
  private readonly theme = inject(BranchTheme);

  /** Paramètre de route : icg, icf, icc ou ics. */
  readonly code = input.required<string>();

  protected readonly branches = BRANCHES;
  protected readonly isEmpty = isRichEmpty;
  protected readonly rankLabel = rankLabel;
  protected readonly branch = computed<BranchInfo | null>(
    () => BRANCHES.find((b) => b.code === this.code().toUpperCase()) ?? null,
  );
  private readonly branchCode = computed<BranchCode | null>(() => this.branch()?.code ?? null);

  private readonly profiles = remote(this.api.branches());
  private readonly allMembers = remote(this.api.members());
  private readonly allTools = remote(this.api.tools());

  protected readonly profile = computed(() => {
    const p = this.profiles();
    return p.state === 'ok' ? (p.value.find((x) => x.code === this.branchCode()) ?? null) : null;
  });
  protected readonly members = computed(() => {
    const m = this.allMembers();
    const code = this.branchCode();
    return m.state === 'ok' && code ? m.value.filter((x) => x.branches.includes(code)) : [];
  });
  protected readonly tools = computed(() => {
    const t = this.allTools();
    const code = this.branchCode();
    return t.state === 'ok' && code ? t.value.filter((x) => x.branches.includes(code)) : [];
  });
  protected readonly news = toSignal(
    toObservable(this.branchCode).pipe(
      switchMap((code) =>
        code
          ? this.api.news(1, 3, code).pipe(
              catchError(() => of<NewsSummary[]>([])),
              startWith<NewsSummary[]>([]),
            )
          : of<NewsSummary[]>([]),
      ),
      map((items) => items),
    ),
    { initialValue: [] as NewsSummary[] },
  );

  constructor() {
    // Change la couleur de l'interface à chaque changement de branche (même composant réutilisé).
    effect(() => this.theme.set(this.branchCode()));
  }

  protected fond(code: BranchCode): string {
    return backgroundUrl(code);
  }

  ngOnDestroy(): void {
    this.theme.set(null); // retour à l'interface neutre en quittant la zone
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberApi } from '../../core/api/member-api';
import { Resource, ResourceCategory } from '../../core/api/models';
import { AuthService } from '../../core/auth.service';
import { remote } from '../../shared/remote';
import { Bandeau } from '../../shared/bandeau';
import { Sceau } from '../../shared/sceau';
import { Status } from '../../shared/status';
import { BANNER_FORMATS } from './banner';
import { ResourceCard } from './resource-card';

@Component({
  selector: 'app-resources',
  imports: [RouterLink, Sceau, Status, Bandeau, ResourceCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Espace membre</p>
        <h1>Ressources du clan</h1>
        <p class="secondaire">
          Logos, visuels et outils pour porter les couleurs de l’Imperium. Réservé aux membres.
        </p>
      </header>

      <section class="section" aria-labelledby="titre-social">
        <div class="section-entete">
          <p class="libelle">Réseaux sociaux</p>
          <h2 class="gothique" id="titre-social">Tes visuels personnalisés</h2>
        </div>
        <div class="grille-l">
          @for (f of formats; track f.id) {
            <a
              class="carte generateur"
              [routerLink]="['/ressources/banniere']"
              [queryParams]="{ format: f.id }"
            >
              <div class="vignette" [style.aspect-ratio]="f.width + ' / ' + f.height">
                <div class="vignette-contenu">
                  <app-sceau [branches]="branches()" [size]="56" [decorative]="true" />
                  <span class="vignette-texte"
                    ><span class="gothique">Imperium</span><strong>{{ pseudo() }}</strong></span
                  >
                </div>
                <app-bandeau />
              </div>
              <h3>{{ f.short }}</h3>
              <p class="secondaire">
                {{ f.label.split(' — ')[1] }} · {{ f.hint }}. Ton pseudo et le sceau de tes
                branches.
              </p>
            </a>
          }
        </div>
        @if (byCategory().social.length) {
          <div class="grille">
            @for (r of byCategory().social; track r.id) {
              <app-resource-card [resource]="r" />
            }
          </div>
        }
      </section>

      <section class="section" aria-labelledby="titre-graphiques">
        <div class="section-entete">
          <p class="libelle">Ressources graphiques</p>
          <h2 class="gothique" id="titre-graphiques">Logos et visuels</h2>
        </div>
        @let res = resources();
        <app-status
          [state]="res.state"
          [empty]="res.state === 'ok' && byCategory().graphics.length === 0"
          emptyText="Aucune ressource graphique pour l’instant."
        />
        <div class="grille">
          @for (r of byCategory().graphics; track r.id) {
            <app-resource-card [resource]="r" />
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .section {
      border-top: 1px solid var(--imp-trait);
    }
    .generateur {
      position: relative;
    }
    .vignette {
      display: grid;
      grid-template-rows: 1fr auto;
      background: var(--imp-noir);
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-m);
      overflow: hidden;
    }
    .vignette-contenu {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--imp-e-4);
    }
    .vignette-texte {
      display: grid;
      line-height: 1.1;
    }
    .vignette-texte .gothique {
      font-size: 1.1rem;
    }
    .vignette-texte strong {
      font-size: 1.25rem;
    }
    .generateur h3 {
      font-size: var(--imp-taille-m);
    }
  `,
})
export class Resources {
  private readonly auth = inject(AuthService);

  protected readonly formats = BANNER_FORMATS;
  protected readonly resources = remote(inject(MemberApi).resources());
  protected readonly pseudo = computed(
    () => this.auth.currentUser()?.member?.pseudo ?? this.auth.currentUser()?.displayName ?? '',
  );
  protected readonly branches = computed(
    () => this.auth.currentUser()?.member?.branches ?? (['ICG', 'ICF', 'ICC', 'ICS'] as const),
  );

  protected readonly byCategory = computed(() => {
    const r = this.resources();
    const items = r.state === 'ok' ? r.value : [];
    const of = (c: ResourceCategory): Resource[] => items.filter((i) => i.category === c);
    return { graphics: of('graphics'), social: of('social') };
  });
}

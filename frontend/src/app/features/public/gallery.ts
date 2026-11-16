import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { BranchPills } from '../../shared/branch-pills';
import { GalleryGrid } from '../../shared/gallery-grid';
import { remote } from '../../shared/remote';
import { Status } from '../../shared/status';

@Component({
  selector: 'app-gallery',
  imports: [RouterLink, DatePipe, BranchPills, GalleryGrid, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Galerie</p>
        <h1>Les heures du clan</h1>
      </header>

      @let ev = events();
      @let im = images();
      @if (ev.state === 'ok' && ev.value.length) {
        <section class="section" aria-labelledby="titre-evenements">
          <h2 class="gothique" id="titre-evenements">Événements</h2>
          <ul class="grille-l liste" role="list">
            @for (e of ev.value; track e.id) {
              <li>
                <a class="carte evenement" [routerLink]="['/galerie', e.slug]">
                  <div class="couverture">
                    @if (e.coverUrl) {
                      <img [src]="e.coverUrl" alt="" loading="lazy" />
                    }
                    <span class="nombre"
                      >{{ e.imageCount }} photo{{ e.imageCount > 1 ? 's' : '' }}</span
                    >
                  </div>
                  <p class="libelle">
                    <time [attr.datetime]="e.date">{{ e.date | date: 'd MMMM y' }}</time>
                  </p>
                  <h3>{{ e.title }}</h3>
                  @if (e.branches.length) {
                    <app-branch-pills [branches]="e.branches" />
                  }
                </a>
              </li>
            }
          </ul>
        </section>
      }

      @if (im.state === 'ok' && im.value.length) {
        <section class="section" aria-labelledby="titre-images">
          <h2 class="gothique" id="titre-images">
            {{ ev.state === 'ok' && ev.value.length ? 'Autres images' : 'Images' }}
          </h2>
          <app-gallery-grid [images]="im.value" />
        </section>
      }

      <app-status
        [state]="
          ev.state === 'error' || im.state === 'error'
            ? 'error'
            : ev.state === 'loading' || im.state === 'loading'
              ? 'loading'
              : 'ok'
        "
        [empty]="ev.state === 'ok' && im.state === 'ok' && !ev.value.length && !im.value.length"
        emptyText="La galerie est encore vide."
      />
    </div>
  `,
  styles: `
    .section {
      padding-top: 0;
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .evenement {
      height: 100%;
      position: relative;
    }
    .couverture {
      position: relative;
      aspect-ratio: 16 / 9;
      margin: calc(-1 * var(--imp-e-5)) calc(-1 * var(--imp-e-5)) var(--imp-e-1);
      border-radius: var(--imp-rayon-l) var(--imp-rayon-l) 0 0;
      overflow: hidden;
      background: var(--imp-noir);
    }
    .couverture img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .evenement:hover .couverture img {
      transform: scale(1.03);
    }
    .nombre {
      position: absolute;
      right: var(--imp-e-3);
      bottom: var(--imp-e-3);
      background: rgb(14 14 16 / 0.8);
      color: var(--imp-ivoire);
      border-radius: var(--imp-rayon-pastille);
      padding: 2px var(--imp-e-3);
      font-size: var(--imp-taille-xs);
      font-weight: 600;
    }
    h3 {
      font-size: var(--imp-taille-l);
    }
  `,
})
export class Gallery {
  private readonly api = inject(PublicApi);
  protected readonly events = remote(this.api.galleryEvents());
  protected readonly images = remote(this.api.gallery());
}

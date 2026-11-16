import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Resource } from '../../core/api/models';

@Component({
  selector: 'app-resource-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte ressource">
      <div class="miniature">
        @if (resource().previewUrl; as preview) {
          <img [src]="preview" alt="" loading="lazy" />
        } @else {
          <span class="format">{{ resource().format }}</span>
        }
      </div>
      <h3>{{ resource().title }}</h3>
      @if (resource().description) {
        <p class="secondaire">{{ resource().description }}</p>
      }
      <p class="code secondaire">{{ resource().format }} · {{ size() }}</p>
      <a class="btn btn-secondaire btn-petit" [href]="resource().downloadUrl" download>
        Télécharger<span class="visually-hidden"> {{ resource().title }}</span>
      </a>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .ressource {
      height: 100%;
    }
    .ressource .btn {
      justify-self: start;
    }
    h3 {
      font-size: var(--imp-taille-m);
    }
    .miniature {
      aspect-ratio: 4 / 3;
      position: relative;
      display: grid;
      place-items: center;
      /* Damier gris : rend visibles les logos transparents, clairs comme foncés */
      background: repeating-conic-gradient(#3a3a42 0 25%, #5c5c5c 0 50%) 0 0 / 16px 16px;
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-m);
      overflow: hidden;
    }
    .miniature img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .format {
      font-family: var(--imp-police-code);
      font-size: var(--imp-taille-l);
      color: var(--imp-gris-sombre);
    }
  `,
})
export class ResourceCard {
  readonly resource = input.required<Resource>();

  protected size(): string {
    const bytes = this.resource().size;
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
      : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  }
}

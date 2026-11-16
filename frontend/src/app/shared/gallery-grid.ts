import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GalleryImage } from '../core/api/models';

/** Mosaïque d'images avec visionneuse (<dialog> natif : focus piégé, Échap pour fermer, flèches pour naviguer). */
@Component({
  selector: 'app-gallery-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <ul class="mosaique" role="list">
      @for (image of images(); track image.id; let i = $index) {
        <li>
          <button
            type="button"
            class="vignette"
            (click)="open(i)"
            [attr.aria-label]="'Agrandir : ' + (image.caption || 'image sans légende')"
          >
            <img
              [src]="image.url"
              [attr.width]="image.width"
              [attr.height]="image.height"
              [alt]="image.caption"
              loading="lazy"
            />
          </button>
        </li>
      }
    </ul>

    <dialog #viewer class="visionneuse" (close)="index.set(null)" aria-label="Image agrandie">
      @if (current(); as image) {
        <figure>
          <img [src]="image.url" [alt]="image.caption" />
          <figcaption>
            @if (image.caption) {
              <span>{{ image.caption }}</span>
            }
            <span class="secondaire">{{ (index() ?? 0) + 1 }} / {{ images().length }}</span>
          </figcaption>
        </figure>
      }
      <div class="actions">
        <button
          type="button"
          class="btn btn-secondaire btn-petit"
          (click)="step(-1)"
          [disabled]="images().length < 2"
          aria-label="Image précédente"
        >
          ←
        </button>
        <form method="dialog">
          <button type="submit" class="btn btn-principal btn-petit">Fermer</button>
        </form>
        <button
          type="button"
          class="btn btn-secondaire btn-petit"
          (click)="step(1)"
          [disabled]="images().length < 2"
          aria-label="Image suivante"
        >
          →
        </button>
      </div>
    </dialog>
  `,
  styles: `
    .mosaique {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-3);
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
    }
    .vignette {
      display: block;
      width: 100%;
      padding: 0;
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-l);
      overflow: hidden;
      background: var(--imp-panneau);
      cursor: zoom-in;
    }
    .vignette img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      height: auto;
      transition: opacity 0.15s;
    }
    .vignette:hover img {
      opacity: 0.85;
    }
    .visionneuse {
      background: var(--imp-panneau);
      color: var(--imp-ivoire);
      border: 1px solid var(--imp-trait-fort);
      border-radius: var(--imp-rayon-xl);
      padding: var(--imp-e-5);
      max-width: min(1100px, 94vw);
      max-height: 94vh;
    }
    .visionneuse::backdrop {
      background: rgb(14 14 16 / 0.85);
    }
    figure {
      margin: 0 0 var(--imp-e-4);
      display: grid;
      gap: var(--imp-e-3);
    }
    figure img {
      max-height: 72vh;
      width: auto;
      margin: 0 auto;
      border-radius: var(--imp-rayon-m);
    }
    figcaption {
      display: flex;
      justify-content: center;
      gap: var(--imp-e-4);
      flex-wrap: wrap;
      text-align: center;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: var(--imp-e-3);
    }
  `,
})
export class GalleryGrid {
  readonly images = input.required<readonly GalleryImage[]>();
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  protected readonly index = signal<number | null>(null);
  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.images()[i] ?? null);
  });

  protected open(i: number): void {
    this.index.set(i);
    this.viewer().nativeElement.showModal();
  }

  protected step(delta: number): void {
    const count = this.images().length;
    this.index.update((i) => (i === null || count === 0 ? i : (i + delta + count) % count));
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.index() === null) {
      return; // visionneuse fermée : on laisse les flèches à la page
    }
    if (event.key === 'ArrowRight') {
      this.step(1);
    } else if (event.key === 'ArrowLeft') {
      this.step(-1);
    }
  }
}

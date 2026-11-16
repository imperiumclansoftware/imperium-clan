import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { backgroundUrl } from '../core/backgrounds';
import { BRANCH_CODES, BranchCode } from '../core/branches';
import { Sceau } from './sceau';

/**
 * Illustration d'une actualité, toujours au même format (16:9). Sans image envoyée, image de remplacement :
 * le fond de la branche de l'actualité (le fond clan si elle en a plusieurs ou aucune) et son sceau.
 */
@Component({
  selector: 'app-news-illustration',
  imports: [Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as url) {
      <img class="image" [src]="url" alt="" [attr.loading]="lazy() ? 'lazy' : null" />
    } @else {
      <div class="remplacement" aria-hidden="true">
        <img class="image" [src]="fallback()" alt="" [attr.loading]="lazy() ? 'lazy' : null" />
        <app-sceau class="sceau" [branches]="sceauBranches()" [size]="160" [decorative]="true" />
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      background: var(--imp-noir);
    }
    .image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .remplacement {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
    }
    .remplacement::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgb(14 14 16 / 0.35);
    }
    .sceau {
      position: relative;
      z-index: 1;
      width: 28%;
      max-width: 160px;
    }
    .sceau ::ng-deep svg {
      width: 100%;
      height: auto;
    }
  `,
})
export class NewsIllustration {
  /** Image envoyée (URL) ; null = image de remplacement. */
  readonly src = input<string | null>(null);
  readonly branches = input<readonly BranchCode[]>([]);
  readonly lazy = input(true);
  /** Affichage grand format (page de l'actualité) : fond de remplacement en pleine résolution. */
  readonly large = input(false);

  protected readonly fallback = computed(() => {
    const b = this.branches();
    return backgroundUrl(b.length === 1 ? b[0] : 'clan', this.large() ? 'full' : 'small');
  });
  protected readonly sceauBranches = computed(() =>
    this.branches().length ? this.branches() : BRANCH_CODES,
  );
}

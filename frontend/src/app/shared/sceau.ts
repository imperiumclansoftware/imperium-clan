import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRANCHES, BranchCode } from '../core/branches';
import { DIAMONDS, I_GOTHIQUE } from '../core/sceau-geometry';

/**
 * Sceau Imperium : un arc par branche, allumé si la branche est dans `branches`.
 * Port Angular de web/sceau.js (bindings SVG, aucun innerHTML).
 */
@Component({
  selector: 'app-sceau',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 200 200"
      [attr.width]="size()"
      [attr.height]="size()"
      role="img"
      [attr.aria-label]="label()"
      [attr.aria-hidden]="decorative() ? 'true' : null"
    >
      @if (size() >= 32) {
        <circle
          cx="100"
          cy="100"
          r="66"
          fill="none"
          [attr.stroke]="palette().ring"
          stroke-width="1.5"
        />
      }
      @for (arc of arcs(); track arc.code) {
        <path [attr.d]="arc.d" fill="none" [style.stroke]="arc.color" stroke-width="14" />
      }
      @if (size() >= 32) {
        @for (d of diamonds; track $index) {
          <rect
            [attr.x]="d[0] - 4"
            [attr.y]="d[1] - 4"
            width="8"
            height="8"
            [attr.transform]="'rotate(45 ' + d[0] + ' ' + d[1] + ')'"
            [attr.fill]="palette().ink"
          />
        }
      }
      @if (!avatar()) {
        <path transform="translate(-4 0)" [attr.d]="glyph" [attr.fill]="palette().ink" />
      }
    </svg>
    @if (avatar(); as src) {
      <!-- Portrait du membre au centre du sceau, à la place du I gothique (img HTML : pas de clipPath
           SVG, dont l'url(#…) casse sous un <base href> non racine). -->
      <img class="portrait" [src]="src" alt="" loading="lazy" />
    }
  `,
  styles: `
    /* Arcs animés : passer d'une branche à l'autre fait glisser la couleur. */
    path[stroke-width='14'] {
      transition: stroke 0.7s ease;
    }
    :host {
      display: inline-block;
      position: relative;
      line-height: 0;
      flex: none;
    }
    /* Disque intérieur du sceau : rayon 62 sur 200, centré */
    .portrait {
      position: absolute;
      left: 19%;
      top: 19%;
      width: 62%;
      height: 62%;
      border-radius: 50%;
      object-fit: cover;
      background: #2a2a31;
    }
  `,
})
export class Sceau {
  readonly branches = input<readonly BranchCode[]>(['ICG', 'ICF', 'ICC', 'ICS']);
  readonly size = input(200);
  readonly background = input<'sombre' | 'clair'>('sombre');
  readonly title = input<string | null>(null);
  /** true quand le nom est déjà écrit à côté : le sceau est alors ignoré par les lecteurs d'écran. */
  readonly decorative = input(false);
  /** Avatar du membre (Conclave), affiché au centre du sceau à la place du I gothique */
  readonly avatar = input<string | null>(null);

  protected readonly glyph = I_GOTHIQUE;
  protected readonly diamonds = DIAMONDS;

  protected readonly palette = computed(() =>
    this.background() === 'clair'
      ? { ink: '#111114', off: '#DDD9D2', ring: '#CFCAC1' }
      : { ink: '#F4F1EC', off: '#2A2A31', ring: '#3A3A42' },
  );

  protected readonly arcs = computed(() => {
    const active = new Set(this.branches());
    const off = this.palette().off;
    return BRANCHES.map((b) => ({
      code: b.code,
      d: b.arc,
      color: active.has(b.code) ? b.hex : off,
    }));
  });

  protected readonly label = computed(() => {
    const custom = this.title();
    if (custom) {
      return custom;
    }
    const names = BRANCHES.filter((b) => this.branches().includes(b.code)).map((b) => b.name);
    return 'Sceau Imperium' + (names.length ? ' : ' + names.join(', ') : '');
  });
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BackgroundKey, backgroundUrl } from '../../core/backgrounds';
import { BranchCode, branchInfo } from '../../core/branches';
import { BranchPicker } from '../../shared/branch-picker';
import { BranchPills } from '../../shared/branch-pills';
import { BANNER_FORMATS, bannerFileName, drawBanner, loadBannerFonts, loadImage } from './banner';

type BackgroundChoice = BackgroundKey | 'uni';

@Component({
  selector: 'app-banner-generator',
  imports: [ReactiveFormsModule, RouterLink, BranchPicker, BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <p class="retour"><a routerLink="/ressources">← Ressources</a></p>
      <header class="page-entete">
        <p class="libelle">Réseaux sociaux</p>
        <h1>Ta bannière Imperium</h1>
        <p class="secondaire">
          Ton pseudo, le sceau de tes branches et les couleurs du clan, prêts à poser sur ton
          profil.
        </p>
      </header>

      <div class="disposition">
        <form class="carte reglages" (submit)="$event.preventDefault(); download()">
          <fieldset class="champ">
            <legend>Format</legend>
            @for (f of formats; track f.id) {
              <label class="case">
                <input
                  type="radio"
                  name="format"
                  [value]="f.id"
                  [checked]="formatId() === f.id"
                  (change)="formatId.set(f.id)"
                />
                <span
                  >{{ f.label }} <span class="secondaire">· {{ f.hint }}</span></span
                >
              </label>
            }
          </fieldset>

          <div class="champ">
            <label for="b-pseudo">Pseudo</label>
            <input
              id="b-pseudo"
              type="text"
              maxlength="40"
              [value]="pseudo()"
              (input)="pseudo.set($any($event.target).value)"
            />
          </div>

          @if (profileBranches(); as branches) {
            <div class="champ">
              <p class="etiquette">Tes branches</p>
              <app-branch-pills [branches]="branches" format="moyen" />
              <p class="aide">
                Elles viennent de ton profil Conclave : ton sceau allume l’arc de chacune.
              </p>
            </div>
          } @else {
            <app-branch-picker [formControl]="branchControl" legend="Tes branches" />
          }

          <fieldset class="champ">
            <legend>Fond</legend>
            <div class="fonds">
              @for (o of backgroundOptions(); track o.key) {
                <label class="fond" [class.choisi]="o.key === background()">
                  <input
                    type="radio"
                    name="fond"
                    class="visually-hidden"
                    [checked]="o.key === background()"
                    (change)="backgroundChoice.set(o.key)"
                  />
                  @if (o.thumb) {
                    <img [src]="o.thumb" alt="" width="120" height="51" />
                  } @else {
                    <span class="uni" aria-hidden="true"></span>
                  }
                  <span>{{ o.label }}</span>
                </label>
              }
            </div>
          </fieldset>

          <button type="submit" class="btn btn-principal" [disabled]="!ready()">
            Télécharger la bannière (PNG)
          </button>
          @if (!ready()) {
            <p class="secondaire" role="status">Chargement des polices…</p>
          }
        </form>

        <figure class="apercu">
          <canvas
            #canvas
            role="img"
            [attr.aria-label]="'Aperçu de la bannière ' + current().label + ' pour ' + pseudo()"
          ></canvas>
          <figcaption class="secondaire">
            Aperçu à l’échelle — le fichier téléchargé fait {{ current().hint }}.
          </figcaption>
        </figure>
      </div>
    </div>
  `,
  styles: `
    .fonds {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--imp-e-2);
    }
    .fond {
      display: grid;
      gap: var(--imp-e-1);
      padding: var(--imp-e-1);
      border: 2px solid var(--imp-trait);
      border-radius: var(--imp-rayon-m);
      cursor: pointer;
      font-size: var(--imp-taille-s);
      transition: border-color 0.3s;
    }
    .fond:hover {
      border-color: var(--imp-trait-fort);
    }
    .fond.choisi {
      border-color: var(--accent);
    }
    .fond:has(input:focus-visible) {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .fond img,
    .uni {
      width: 100%;
      height: auto;
      aspect-ratio: 1584 / 672;
      border-radius: var(--imp-rayon-s);
      object-fit: cover;
    }
    .uni {
      display: block;
      background: var(--imp-noir);
      border: 1px solid var(--imp-trait);
    }
    .retour a {
      color: var(--imp-gris-sombre);
      text-decoration: none;
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      margin-top: var(--imp-e-5);
    }
    .retour a:hover {
      color: var(--imp-ivoire);
    }
    .page-entete {
      padding-top: var(--imp-e-4);
    }
    .disposition {
      display: grid;
      gap: var(--imp-e-5);
      align-items: start;
    }
    @media (min-width: 1100px) {
      .disposition {
        grid-template-columns: 380px 1fr;
      }
    }
    .reglages {
      gap: var(--imp-e-5);
    }
    .reglages .btn {
      justify-self: start;
    }
    .etiquette {
      font-weight: 600;
      font-size: var(--imp-taille-s);
    }
    .aide {
      font-size: var(--imp-taille-s);
      color: var(--imp-gris-sombre);
    }
    .apercu {
      margin: 0;
      display: grid;
      gap: var(--imp-e-3);
    }
    canvas {
      width: 100%;
      height: auto;
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-l);
      background: var(--imp-noir);
    }
  `,
})
export class BannerGenerator {
  private readonly auth = inject(AuthService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** ?format=x pour ouvrir directement un format. */
  readonly format = input<string>();

  protected readonly formats = BANNER_FORMATS;
  protected readonly formatId = signal(BANNER_FORMATS[0].id);
  protected readonly current = computed(
    () => BANNER_FORMATS.find((f) => f.id === this.formatId()) ?? BANNER_FORMATS[0],
  );
  protected readonly ready = signal(false);

  private readonly profile = computed(() => this.auth.currentUser()?.member ?? null);
  protected readonly profileBranches = computed(() => this.profile()?.branches ?? null);
  protected readonly pseudo = signal(
    this.profile()?.pseudo ?? this.auth.currentUser()?.displayName ?? '',
  );

  protected readonly branchControl = new FormControl<BranchCode[]>(['ICG', 'ICF', 'ICC', 'ICS'], {
    nonNullable: true,
  });
  private readonly pickedBranches = toSignal(this.branchControl.valueChanges, {
    initialValue: this.branchControl.value,
  });
  private readonly branches = computed(() => this.profileBranches() ?? this.pickedBranches());

  /** Fonds proposés : ceux des branches du membre, le fond clan (4 couleurs) et un fond uni. */
  protected readonly backgroundOptions = computed(() => [
    ...this.branches().map((code) => ({
      key: code as BackgroundChoice,
      label: `${code} · ${branchInfo(code).short}`,
      thumb: backgroundUrl(code, 'small'),
    })),
    { key: 'clan' as BackgroundChoice, label: 'Clan', thumb: backgroundUrl('clan', 'small') },
    { key: 'uni' as BackgroundChoice, label: 'Uni', thumb: null },
  ]);
  protected readonly backgroundChoice = signal<BackgroundChoice | null>(null);
  /** Choix explicite s'il est encore proposé ; sinon la branche du membre s'il n'en a qu'une, le fond clan sinon. */
  protected readonly background = computed<BackgroundChoice>(() => {
    const choice = this.backgroundChoice();
    if (choice && this.backgroundOptions().some((o) => o.key === choice)) {
      return choice;
    }
    const branches = this.branches();
    return branches.length === 1 ? branches[0] : 'clan';
  });
  private readonly images = new Map<BackgroundKey, Promise<HTMLImageElement>>();
  private readonly backgroundImage = signal<HTMLImageElement | null>(null);

  constructor() {
    effect(() => {
      const requested = this.format();
      if (requested && BANNER_FORMATS.some((f) => f.id === requested)) {
        this.formatId.set(requested);
      }
    });
    void loadBannerFonts().finally(() => this.ready.set(true));

    // Charge (une seule fois par fond) l'image choisie, puis déclenche le redessin.
    effect(() => {
      const key = this.background();
      if (key === 'uni') {
        this.backgroundImage.set(null);
        return;
      }
      let image = this.images.get(key);
      if (!image) {
        image = loadImage(backgroundUrl(key));
        this.images.set(key, image);
      }
      image.then(
        (img) => {
          if (this.background() === key) {
            this.backgroundImage.set(img);
          }
        },
        () => this.backgroundImage.set(null),
      );
    });

    // Redessine à chaque changement. Les dimensions ne sont fixées QU'ICI : redimensionner un canvas
    // l'efface, un binding width/height réappliqué après le dessin donnerait une image vide.
    effect(() => {
      const options = {
        pseudo: this.pseudo(),
        branches: this.branches(),
        format: this.current(),
        background: this.backgroundImage(),
      };
      if (!this.ready()) {
        return;
      }
      const canvas = this.canvas().nativeElement;
      canvas.width = options.format.width;
      canvas.height = options.format.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawBanner(ctx, options);
      }
    });
  }

  protected download(): void {
    const name = bannerFileName(this.current(), this.pseudo());
    this.canvas().nativeElement.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
}

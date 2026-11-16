import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage, atomToLocalInput, localInputToAtom } from '../../core/api/errors';
import { News, RichDoc, RichNode } from '../../core/api/models';
import { BranchCode } from '../../core/branches';
import { BranchPicker } from '../../shared/branch-picker';
import { DropZone } from '../../shared/drop-zone';
import { NewsIllustration } from '../../shared/news-illustration';
import { RichEditor } from '../../shared/rich-editor';

const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE = 8 * 1024 * 1024;

@Component({
  selector: 'app-news-editor',
  imports: [ReactiveFormsModule, RouterLink, BranchPicker, DropZone, NewsIllustration, RichEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p><a routerLink="/admin/actualites" class="secondaire retour">← Actualités</a></p>
    <h1 class="titre">{{ article() ? 'Modifier l’actualité' : 'Nouvelle actualité' }}</h1>

    <form class="disposition" [formGroup]="form" (ngSubmit)="save()">
      <div class="carte principal">
        <div class="champ">
          <label for="n-title">Titre</label>
          <input id="n-title" type="text" formControlName="title" maxlength="160" required />
        </div>
        <div class="champ">
          <label for="n-excerpt">Résumé</label>
          <textarea
            id="n-excerpt"
            formControlName="excerpt"
            maxlength="300"
            rows="3"
            required
            aria-describedby="n-excerpt-aide"
          ></textarea>
          <p class="aide" id="n-excerpt-aide">
            Affiché sur les cartes et en chapeau de l’article (300 caractères maximum).
          </p>
        </div>
        <div class="champ">
          <span class="etiquette" id="n-content-label">Texte</span>
          <app-rich-editor formControlName="content" label="Texte de l’actualité" />
          <p class="aide">
            Intertitres, gras, italique, listes, citations et liens. Le collage depuis un autre site
            ne garde que ces mises en forme.
          </p>
        </div>
      </div>

      <aside class="pile cote">
        <section class="carte" aria-labelledby="illu-titre">
          <h2 id="illu-titre">Image d’illustration</h2>
          @if (pendingPreview(); as preview) {
            <div class="apercu-attente">
              <img [src]="preview" alt="Image choisie, envoyée à l’enregistrement" />
            </div>
          } @else {
            <app-news-illustration
              class="apercu"
              [src]="article()?.coverUrl ?? null"
              [branches]="branches()"
              [lazy]="false"
            />
          }
          @if (!article()?.coverUrl && !pendingPreview()) {
            <p class="aide">
              Sans image, l’actualité affiche cette illustration de remplacement : le fond de sa
              branche (le fond clan si elle en a plusieurs ou aucune).
            </p>
          }
          <app-drop-zone
            accept="image/jpeg,image/png,image/webp"
            title="Glisse une image ici"
            hint="JPEG, PNG ou WebP · 8 Mo maximum · format paysage 16:9 conseillé"
            [multiple]="false"
            (files)="chooseImage($event[0])"
          />
          @if (imageError()) {
            <p class="erreur" role="alert">{{ imageError() }}</p>
          }
          @if (article()?.coverUrl || pendingPreview()) {
            <button type="button" class="btn btn-secondaire btn-petit" (click)="removeImage()">
              Retirer l’image
            </button>
          }
        </section>

        <section class="carte">
          <app-branch-picker formControlName="branches" legend="Branches concernées (facultatif)" />
          <div class="champ">
            <label for="n-date">Date de publication</label>
            <input
              id="n-date"
              type="datetime-local"
              formControlName="publishedAt"
              aria-describedby="n-date-aide"
            />
            <p class="aide" id="n-date-aide">
              Vide = brouillon. Une date future programme la publication.
            </p>
          </div>
        </section>

        <div class="carte actions">
          @if (error()) {
            <p class="erreur" role="alert">{{ error() }}</p>
          }
          @if (saved()) {
            <p class="succes" role="status">Enregistré.</p>
          }
          <button type="submit" class="btn btn-principal" [disabled]="form.invalid || pending()">
            Enregistrer
          </button>
          <button
            type="button"
            class="btn btn-secondaire"
            (click)="publishNow()"
            [disabled]="form.invalid || pending()"
          >
            Publier maintenant
          </button>
          @if (article()) {
            <button type="button" class="btn btn-danger" (click)="remove()">Supprimer</button>
          }
        </div>
      </aside>
    </form>
  `,
  styles: `
    .retour {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
    }
    .titre {
      margin: var(--imp-e-3) 0 var(--imp-e-6);
    }
    .disposition {
      display: grid;
      gap: var(--imp-e-5);
      align-items: start;
    }
    @media (min-width: 1200px) {
      .disposition {
        grid-template-columns: 1fr 360px;
      }
      .cote {
        position: sticky;
        top: var(--imp-e-5);
      }
    }
    .principal {
      gap: var(--imp-e-5);
    }
    .cote {
      gap: var(--imp-e-4);
    }
    .etiquette {
      font-weight: 600;
      font-size: var(--imp-taille-s);
    }
    .apercu,
    .apercu-attente {
      border-radius: var(--imp-rayon-m);
      overflow: hidden;
    }
    .apercu-attente {
      aspect-ratio: 16 / 9;
      background: var(--imp-noir);
    }
    .apercu-attente img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .actions {
      gap: var(--imp-e-3);
    }
    .actions .btn,
    .carte > .btn {
      justify-self: start;
    }
  `,
})
export class NewsEditor implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  /** Paramètre de route : UUID de l'actualité, absent pour une création. */
  readonly id = input<string>();

  protected readonly article = signal<News | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly saved = signal(false);
  protected readonly pending = signal(false);
  /** Image choisie avant la création de l'actualité : envoyée juste après le premier enregistrement. */
  private pendingFile: File | null = null;
  protected readonly pendingPreview = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    excerpt: ['', [Validators.required, Validators.maxLength(300)]],
    content: [EMPTY_DOC],
    branches: [[] as BranchCode[]],
    publishedAt: [''],
  });
  protected readonly branches = toSignal(this.form.controls.branches.valueChanges, {
    initialValue: [] as BranchCode[],
  });
  private readonly contentValue = toSignal(this.form.controls.content.valueChanges, {
    initialValue: EMPTY_DOC,
  });
  protected readonly isEmpty = computed(() => !hasText(this.contentValue().content));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearPending());
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.article(id).subscribe({
        next: (a) => this.fill(a),
        error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Actualité introuvable.')),
      });
    }
  }

  protected publishNow(): void {
    this.form.controls.publishedAt.setValue(atomToLocalInput(new Date().toISOString()));
    this.save();
  }

  protected save(): void {
    if (this.isEmpty()) {
      this.error.set('Écris le texte de l’actualité.');
      return;
    }
    const v = this.form.getRawValue();
    const input = {
      title: v.title,
      excerpt: v.excerpt,
      content: v.content,
      branches: v.branches,
      publishedAt: localInputToAtom(v.publishedAt),
    };
    const current = this.article();
    this.pending.set(true);
    this.saved.set(false);
    this.error.set(null);
    const request: Observable<News> = current
      ? this.api.updateNews(current.id, input)
      : this.api.createNews(input);
    request
      .pipe(
        switchMap((a) => (this.pendingFile ? this.api.uploadCover(a.id, this.pendingFile) : of(a))),
      )
      .subscribe({
        next: (a) => {
          this.pending.set(false);
          this.saved.set(true);
          this.clearPending();
          this.fill(a);
          if (!current) {
            void this.router.navigate(['/admin/actualites', a.id], { replaceUrl: true });
          }
        },
        error: (e: unknown) => {
          this.pending.set(false);
          this.error.set(apiErrorMessage(e));
        },
      });
  }

  protected chooseImage(file: File | undefined): void {
    this.imageError.set(null);
    if (!file) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE) {
      this.imageError.set('Image JPEG, PNG ou WebP de 8 Mo maximum.');
      return;
    }
    const current = this.article();
    if (!current) {
      // Pas encore d'actualité : l'image attend le premier enregistrement.
      this.clearPending();
      this.pendingFile = file;
      this.pendingPreview.set(URL.createObjectURL(file));
      return;
    }
    this.api.uploadCover(current.id, file).subscribe({
      next: (a) => this.article.set(a),
      error: (e: unknown) => this.imageError.set(apiErrorMessage(e)),
    });
  }

  protected removeImage(): void {
    if (this.pendingPreview()) {
      this.clearPending();
      return;
    }
    const current = this.article();
    if (current && confirm('Retirer l’image d’illustration ?')) {
      this.api.removeCover(current.id).subscribe((a) => this.article.set(a));
    }
  }

  protected remove(): void {
    const current = this.article();
    if (current && confirm(`Supprimer « ${current.title} » ?`)) {
      this.api
        .deleteNews(current.id)
        .subscribe(() => void this.router.navigate(['/admin/actualites']));
    }
  }

  private fill(a: News): void {
    this.article.set(a);
    this.form.setValue({
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      branches: [...a.branches],
      publishedAt: atomToLocalInput(a.publishedAt),
    });
  }

  private clearPending(): void {
    const preview = this.pendingPreview();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    this.pendingPreview.set(null);
    this.pendingFile = null;
  }
}

function hasText(nodes: readonly RichNode[] | undefined): boolean {
  return (nodes ?? []).some(
    (n) => (n.type === 'text' && (n.text ?? '').trim() !== '') || hasText(n.content),
  );
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminClanPage } from '../../core/api/models';
import { EMPTY_DOC } from '../../core/rich';
import { RichEditor } from '../../shared/rich-editor';

@Component({
  selector: 'app-pages-admin',
  imports: [ReactiveFormsModule, RichEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Présentation du clan</h1>
      <p class="secondaire">
        Sections de la page « Le clan » : intertitres, mises en forme, listes, liens et images.
      </p>
    </header>

    <div class="disposition">
      <section class="pile" aria-label="Sections">
        @for (page of pages(); track page.id) {
          <article class="carte">
            <h2>
              {{ page.title }}
              @if (!page.published) {
                <span class="libelle">· masquée</span>
              }
            </h2>
            <p class="code secondaire">#{{ page.slug }} · ordre {{ page.position }}</p>
            <div class="ligne">
              <button type="button" class="btn btn-secondaire btn-petit" (click)="edit(page)">
                Modifier
              </button>
              <button type="button" class="btn btn-danger btn-petit" (click)="remove(page)">
                Supprimer
              </button>
            </div>
          </article>
        } @empty {
          <p class="secondaire">Aucune section.</p>
        }
      </section>

      <form class="carte formulaire" [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editing() ? 'Modifier la section' : 'Nouvelle section' }}</h2>
        <div class="champ">
          <label for="p-title">Titre</label
          ><input id="p-title" type="text" formControlName="title" maxlength="120" required />
        </div>
        <div class="champ">
          <label for="p-slug">Identifiant</label>
          <input
            id="p-slug"
            type="text"
            formControlName="slug"
            maxlength="60"
            required
            aria-describedby="p-slug-aide"
          />
          <p class="aide" id="p-slug-aide">
            Minuscules, chiffres et tirets (ex. : nos-valeurs). Sert d’ancre dans la page.
          </p>
        </div>
        <div class="champ">
          <span class="etiquette">Texte</span>
          <app-rich-editor
            formControlName="content"
            label="Texte de la section"
            placeholder="Présente le clan…"
          />
        </div>
        <div class="champ">
          <label for="p-pos">Ordre d’affichage</label
          ><input id="p-pos" type="number" formControlName="position" min="0" max="1000" />
        </div>
        <label class="case"
          ><input type="checkbox" formControlName="published" /> Visible sur le site</label
        >
        @if (error()) {
          <p class="erreur" role="alert">{{ error() }}</p>
        }
        <div class="ligne">
          <button type="submit" class="btn btn-principal" [disabled]="form.invalid">
            Enregistrer
          </button>
          @if (editing()) {
            <button type="button" class="btn btn-secondaire" (click)="reset()">Annuler</button>
          }
        </div>
      </form>
    </div>
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .disposition {
      display: grid;
      gap: var(--imp-e-5);
      align-items: start;
    }
    @media (min-width: 1100px) {
      .disposition {
        grid-template-columns: 320px 1fr;
      }
    }
    .formulaire {
      gap: var(--imp-e-4);
    }
    .etiquette {
      font-weight: 600;
      font-size: var(--imp-taille-s);
    }
  `,
})
export class PagesAdmin {
  private readonly api = inject(AdminApi);

  protected readonly pages = signal<AdminClanPage[]>([]);
  protected readonly editing = signal<AdminClanPage | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    title: ['', Validators.required],
    content: [EMPTY_DOC],
    position: [0],
    published: [true],
  });

  constructor() {
    this.load();
  }

  protected edit(page: AdminClanPage): void {
    this.editing.set(page);
    this.error.set(null);
    this.form.setValue({
      slug: page.slug,
      title: page.title,
      content: page.content,
      position: page.position,
      published: page.published,
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.error.set(null);
    this.form.reset({ slug: '', title: '', content: EMPTY_DOC, position: 0, published: true });
  }

  protected save(): void {
    const input = this.form.getRawValue();
    const current = this.editing();
    (current ? this.api.updatePage(current.id, input) : this.api.createPage(input)).subscribe({
      next: () => {
        this.reset();
        this.load();
      },
      error: (e: unknown) => this.error.set(apiErrorMessage(e)),
    });
  }

  protected remove(page: AdminClanPage): void {
    if (confirm(`Supprimer la section « ${page.title} » ?`)) {
      this.api.deletePage(page.id).subscribe(() => this.load());
    }
  }

  private load(): void {
    this.api.pages().subscribe((pages) => this.pages.set(pages));
  }
}

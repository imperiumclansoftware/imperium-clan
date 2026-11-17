import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, from, map, mergeMap, of } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminGalleryEvent, GalleryImage } from '../../core/api/models';
import { BranchCode } from '../../core/branches';
import { EMPTY_DOC } from '../../core/rich';
import { BranchPicker } from '../../shared/branch-picker';
import { DropZone } from '../../shared/drop-zone';
import { RichEditor } from '../../shared/rich-editor';

/** Mêmes règles que le serveur (ImageStorage) : vérification indicative, le serveur reste seul juge. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024;
const MAX_FILES_PER_DROP = 50;
const CONCURRENCY = 3;

/** Vue courante : toutes les images, hors événement, un événement, ou création d'un événement. */
type View = 'all' | 'none' | 'new' | string;
type UploadStatus = 'attente' | 'envoi' | 'ok' | 'erreur';

interface UploadItem {
  readonly key: number;
  readonly name: string;
  readonly preview: string;
  readonly status: UploadStatus;
  readonly error?: string;
}

@Component({
  selector: 'app-gallery-admin',
  imports: [DatePipe, ReactiveFormsModule, BranchPicker, DropZone, RichEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Galerie</h1>
      <p class="secondaire">
        Regroupe les images par événement. Un événement reste en brouillon, invisible du public,
        tant qu’il n’est pas publié.
      </p>
    </header>

    <div class="disposition">
      <nav class="albums" aria-label="Événements de la galerie">
        <button type="button" class="btn btn-principal btn-petit nouveau" (click)="select('new')">
          Nouvel événement
        </button>
        <ul role="list">
          <li>
            <button
              type="button"
              class="album"
              [class.actif]="view() === 'all'"
              [attr.aria-current]="view() === 'all' ? 'true' : null"
              (click)="select('all')"
            >
              <span>Toutes les images</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="album"
              [class.actif]="view() === 'none'"
              [attr.aria-current]="view() === 'none' ? 'true' : null"
              (click)="select('none')"
            >
              <span>Hors événement</span>
            </button>
          </li>
          @for (e of events(); track e.id) {
            <li>
              <button
                type="button"
                class="album"
                [class.actif]="view() === e.id"
                [attr.aria-current]="view() === e.id ? 'true' : null"
                (click)="select(e.id)"
              >
                <span class="titre">{{ e.title }}</span>
                <span class="meta">
                  {{ e.date | date: 'd MMM y' }} · {{ e.imageCount }}
                  @if (!e.published) {
                    <span class="brouillon">brouillon</span>
                  }
                </span>
              </button>
            </li>
          }
        </ul>
      </nav>

      <div class="pile contenu">
        @if (view() === 'new' || currentEvent()) {
          <form class="carte formulaire" [formGroup]="form" (ngSubmit)="saveEvent()">
            <h2>{{ currentEvent() ? 'Événement' : 'Nouvel événement' }}</h2>
            <div class="ligne">
              <div class="champ grand">
                <label for="e-title">Titre</label>
                <input id="e-title" type="text" formControlName="title" maxlength="120" required />
              </div>
              <div class="champ">
                <label for="e-date">Date</label>
                <input id="e-date" type="date" formControlName="date" required />
              </div>
            </div>
            <div class="champ">
              <span class="etiquette"
                >Description <span class="secondaire">(facultatif)</span></span
              >
              <app-rich-editor
                formControlName="description"
                label="Description de l’événement"
                placeholder="Raconte l’événement…"
                class="editeur-court"
              />
            </div>
            <app-branch-picker
              formControlName="branches"
              legend="Branches concernées (facultatif)"
            />
            <label class="case"
              ><input type="checkbox" formControlName="published" /> Publié (visible sur le
              site)</label
            >
            @if (formError()) {
              <p class="erreur" role="alert">{{ formError() }}</p>
            }
            <div class="ligne">
              <button type="submit" class="btn btn-principal btn-petit" [disabled]="form.invalid">
                {{ currentEvent() ? 'Enregistrer' : 'Créer l’événement' }}
              </button>
              @if (currentEvent(); as e) {
                @if (e.published) {
                  <a class="lien" [href]="'galerie/' + e.slug" target="_blank" rel="noopener"
                    >Voir sur le site</a
                  >
                }
                <button type="button" class="btn btn-danger btn-petit" (click)="deleteEvent(e)">
                  Supprimer l’événement
                </button>
              }
              @if (saved()) {
                <span class="succes" role="status">Enregistré.</span>
              }
            </div>
          </form>
        }

        @if (view() !== 'new') {
          <section class="carte ajout" aria-labelledby="ajout-titre">
            <h2 id="ajout-titre">
              Ajouter des images{{
                currentEvent()
                  ? ' à « ' + currentEvent()?.title + ' »'
                  : view() === 'none'
                    ? ' hors événement'
                    : ''
              }}
            </h2>
            <app-drop-zone
              accept="image/jpeg,image/png,image/webp"
              title="Glisse tes images ici"
              [hint]="
                'JPEG, PNG ou WebP · 8 Mo maximum par image · ' + maxFiles + ' images par envoi'
              "
              (files)="addFiles($event)"
            />
            @if (rejected().length) {
              <div class="erreur" role="alert">
                <p>Fichiers ignorés :</p>
                <ul>
                  @for (r of rejected(); track $index) {
                    <li>{{ r }}</li>
                  }
                </ul>
              </div>
            }
            @if (queue().length) {
              <div class="ligne entre">
                <p role="status">{{ summary() }}</p>
                @if (!busy()) {
                  <button type="button" class="btn btn-secondaire btn-petit" (click)="clearQueue()">
                    Vider la liste
                  </button>
                }
              </div>
              <ul class="file" role="list">
                @for (item of queue(); track item.key) {
                  <li class="fichier" [attr.data-statut]="item.status">
                    <img [src]="item.preview" alt="" width="40" height="40" />
                    <span class="nom">{{ item.name }}</span>
                    @if (item.error) {
                      <span class="erreur">{{ item.error }}</span>
                    }
                    <span class="statut">{{ label(item.status) }}</span>
                  </li>
                }
              </ul>
            }
          </section>

          <section aria-labelledby="images-titre" class="pile">
            <div class="ligne entre">
              <h2 id="images-titre">Images ({{ images().length }})</h2>
              @if (images().length) {
                <label class="case"
                  ><input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" /> Tout
                  sélectionner</label
                >
              }
            </div>

            @if (selected().size) {
              <div class="carte barre" role="region" aria-label="Actions sur la sélection">
                <span
                  >{{ selected().size }} image{{ selected().size > 1 ? 's' : '' }} sélectionnée{{
                    selected().size > 1 ? 's' : ''
                  }}</span
                >
                <label for="cible" class="visually-hidden">Déplacer vers</label>
                <select id="cible" #cible>
                  <option value="">Hors événement</option>
                  @for (e of events(); track e.id) {
                    <option [value]="e.id">{{ e.title }} ({{ e.date | date: 'd MMM y' }})</option>
                  }
                </select>
                <button
                  type="button"
                  class="btn btn-secondaire btn-petit"
                  (click)="move(cible.value || null)"
                >
                  Déplacer
                </button>
                <button
                  type="button"
                  class="btn btn-secondaire btn-petit"
                  (click)="clearSelection()"
                >
                  Annuler
                </button>
              </div>
            }

            <ul class="grille liste" role="list">
              @for (image of images(); track image.id) {
                <li class="carte image" [class.choisie]="selected().has(image.id)">
                  <label class="selection">
                    <input
                      type="checkbox"
                      [checked]="selected().has(image.id)"
                      (change)="toggle(image.id)"
                    />
                    <span class="visually-hidden">Sélectionner l’image {{ image.caption }}</span>
                  </label>
                  @if (currentEvent()?.coverImageId === image.id) {
                    <span class="badge">Couverture</span>
                  }
                  <img [src]="image.url" [alt]="image.caption" class="apercu" loading="lazy" />
                  <label class="visually-hidden" [for]="'c-' + image.id">Légende</label>
                  <input
                    [id]="'c-' + image.id"
                    type="text"
                    [value]="image.caption"
                    maxlength="200"
                    placeholder="Légende"
                    #c
                  />
                  <div class="ligne">
                    <button
                      type="button"
                      class="btn btn-secondaire btn-petit"
                      (click)="saveCaption(image, c.value)"
                    >
                      Enregistrer
                    </button>
                    @if (currentEvent() && currentEvent()?.coverImageId !== image.id) {
                      <button
                        type="button"
                        class="btn btn-secondaire btn-petit"
                        (click)="setCover(image)"
                      >
                        Couverture
                      </button>
                    }
                    <button type="button" class="btn btn-danger btn-petit" (click)="remove(image)">
                      Supprimer
                    </button>
                  </div>
                </li>
              } @empty {
                <li class="secondaire">Aucune image ici.</li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .etiquette {
      font-weight: 600;
      font-size: var(--imp-taille-s);
    }
    /* Description d'événement : zone de saisie moins haute que pour un article */
    .editeur-court ::ng-deep .ProseMirror {
      min-height: 140px;
    }
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
        grid-template-columns: 260px 1fr;
      }
      .albums {
        position: sticky;
        top: var(--imp-e-5);
      }
    }
    .albums {
      display: grid;
      gap: var(--imp-e-3);
    }
    .albums ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-1);
      max-height: 70vh;
      overflow-y: auto;
    }
    .nouveau {
      justify-self: start;
    }
    .album {
      display: grid;
      gap: 2px;
      width: 100%;
      min-height: 44px;
      padding: var(--imp-e-2) var(--imp-e-3);
      text-align: left;
      background: transparent;
      color: var(--imp-gris-sombre);
      border: 1px solid transparent;
      border-radius: var(--imp-rayon-m);
      font: inherit;
      cursor: pointer;
    }
    .album:hover {
      color: var(--imp-ivoire);
      background: var(--imp-panneau);
    }
    .album.actif {
      color: var(--imp-ivoire);
      background: var(--imp-panneau);
      border-color: var(--imp-trait-fort);
    }
    .album .titre {
      font-weight: 600;
    }
    .album .meta {
      font-size: var(--imp-taille-xs);
    }
    .brouillon {
      color: var(--imp-icf);
      font-weight: 600;
      margin-left: var(--imp-e-1);
    }
    .contenu {
      gap: var(--imp-e-5);
      min-width: 0;
    }
    .formulaire,
    .ajout {
      gap: var(--imp-e-4);
    }
    .grand {
      flex: 1;
      min-width: 240px;
    }
    .lien {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--imp-gris-sombre);
    }
    .entre {
      justify-content: space-between;
    }
    .erreur ul {
      margin: var(--imp-e-1) 0 0;
      padding-left: var(--imp-e-5);
    }
    .file {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-1);
      max-height: 320px;
      overflow-y: auto;
      font-size: var(--imp-taille-s);
    }
    .fichier {
      display: flex;
      align-items: center;
      gap: var(--imp-e-3);
      padding: var(--imp-e-1) var(--imp-e-2);
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-s);
    }
    .fichier img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
    }
    .fichier .nom {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .statut {
      font-size: var(--imp-taille-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--imp-gris-sombre);
    }
    .fichier[data-statut='ok'] .statut {
      color: var(--imp-ics);
    }
    .fichier[data-statut='erreur'] {
      border-color: var(--imp-icg);
    }
    .fichier[data-statut='erreur'] .statut {
      color: var(--imp-icg);
    }
    .barre {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--imp-e-3);
      padding: var(--imp-e-3) var(--imp-e-4);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .barre select {
      width: auto;
      min-width: 220px;
    }
    .liste {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .image {
      position: relative;
      transition: border-color 0.2s;
    }
    .image.choisie {
      border-color: var(--accent);
    }
    .selection {
      position: absolute;
      top: var(--imp-e-3);
      left: var(--imp-e-3);
      z-index: 1;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      background: rgb(14 14 16 / 0.75);
      border-radius: var(--imp-rayon-m);
      cursor: pointer;
    }
    .badge {
      position: absolute;
      top: var(--imp-e-4);
      right: var(--imp-e-4);
      z-index: 1;
      background: var(--imp-ivoire);
      color: var(--imp-noir);
      font-size: var(--imp-taille-xs);
      font-weight: 700;
      padding: 2px var(--imp-e-2);
      border-radius: var(--imp-rayon-s);
    }
    .apercu {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: var(--imp-rayon-m);
    }
  `,
})
export class GalleryAdmin {
  private readonly api = inject(AdminApi);
  private nextKey = 0;
  private readonly files = new Map<number, File>();

  protected readonly maxFiles = MAX_FILES_PER_DROP;
  protected readonly view = signal<View>('all');
  protected readonly events = signal<AdminGalleryEvent[]>([]);
  protected readonly images = signal<GalleryImage[]>([]);
  protected readonly selected = signal(new Set<string>());
  protected readonly queue = signal<UploadItem[]>([]);
  protected readonly rejected = signal<string[]>([]);
  protected readonly formError = signal<string | null>(null);
  protected readonly saved = signal(false);

  protected readonly currentEvent = computed(
    () => this.events().find((e) => e.id === this.view()) ?? null,
  );
  protected readonly allSelected = computed(
    () => this.images().length > 0 && this.selected().size === this.images().length,
  );
  protected readonly busy = computed(() =>
    this.queue().some((i) => i.status === 'attente' || i.status === 'envoi'),
  );
  protected readonly summary = computed(() => {
    const items = this.queue();
    const done = items.filter((i) => i.status === 'ok').length;
    const failed = items.filter((i) => i.status === 'erreur').length;
    if (this.busy()) {
      return `Envoi en cours : ${done + failed} / ${items.length}…`;
    }
    return (
      `${done} image${done > 1 ? 's' : ''} ajoutée${done > 1 ? 's' : ''}` +
      (failed ? `, ${failed} en erreur.` : '.')
    );
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    date: [today(), Validators.required],
    description: [EMPTY_DOC],
    branches: [[] as BranchCode[]],
    published: [false],
  });

  constructor() {
    this.loadEvents();
    inject(DestroyRef).onDestroy(() => this.queue().forEach((i) => URL.revokeObjectURL(i.preview)));

    // Change de vue : recharge les images et remplit le formulaire de l'événement.
    effect(() => {
      const view = this.view();
      this.selected.set(new Set());
      this.saved.set(false);
      this.formError.set(null);
      if (view === 'new') {
        this.form.reset({
          title: '',
          date: today(),
          description: EMPTY_DOC,
          branches: [],
          published: false,
        });
        return;
      }
      this.loadImages();
    });
    effect(() => {
      const e = this.currentEvent();
      if (e) {
        this.form.reset({
          title: e.title,
          date: e.date,
          description: e.description,
          branches: [...e.branches],
          published: e.published,
        });
      }
    });
  }

  protected select(view: View): void {
    this.view.set(view);
  }

  protected saveEvent(): void {
    const v = this.form.getRawValue();
    const current = this.currentEvent();
    const input = { ...v, coverImageId: current?.coverImageId ?? null };
    this.formError.set(null);
    (current
      ? this.api.updateGalleryEvent(current.id, input)
      : this.api.createGalleryEvent(input)
    ).subscribe({
      next: (event) => {
        this.upsertEvent(event);
        this.saved.set(true);
        if (!current) {
          this.view.set(event.id);
        }
      },
      error: (e: unknown) => this.formError.set(apiErrorMessage(e)),
    });
  }

  protected deleteEvent(event: AdminGalleryEvent): void {
    if (
      confirm(
        `Supprimer l’événement « ${event.title} » ? Ses images restent dans la galerie, hors événement.`,
      )
    ) {
      this.api.deleteGalleryEvent(event.id).subscribe(() => {
        this.events.update((list) => list.filter((e) => e.id !== event.id));
        this.view.set('none');
      });
    }
  }

  protected setCover(image: GalleryImage): void {
    const e = this.currentEvent();
    if (!e) {
      return;
    }
    this.api
      .updateGalleryEvent(e.id, {
        title: e.title,
        date: e.date,
        description: e.description,
        branches: [...e.branches],
        published: e.published,
        coverImageId: image.id,
      })
      .subscribe({
        next: (event) => this.upsertEvent(event),
        error: (err: unknown) => this.formError.set(apiErrorMessage(err)),
      });
  }

  protected toggle(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.images().map((i) => i.id)));
  }

  protected move(eventId: string | null): void {
    const ids = [...this.selected()];
    this.api.moveImages(ids, eventId).subscribe(() => {
      this.selected.set(new Set());
      this.loadImages();
      this.loadEvents();
    });
  }

  protected addFiles(files: File[]): void {
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} : format non accepté (JPEG, PNG ou WebP).`);
      } else if (file.size > MAX_SIZE) {
        rejected.push(`${file.name} : plus de 8 Mo.`);
      } else if (accepted.length >= MAX_FILES_PER_DROP) {
        rejected.push(`${file.name} : plus de ${MAX_FILES_PER_DROP} images dans cet envoi.`);
      } else {
        accepted.push(file);
      }
    }
    this.rejected.set(rejected);
    if (!accepted.length) {
      return;
    }
    const target = this.currentEvent()?.id ?? null;
    const items = accepted.map((file): UploadItem => {
      const key = this.nextKey++;
      this.files.set(key, file);
      return { key, name: file.name, preview: URL.createObjectURL(file), status: 'attente' };
    });
    this.queue.update((q) => [...q, ...items]);
    from(items.map((i) => i.key))
      .pipe(
        mergeMap((key) => {
          const file = this.files.get(key);
          if (!file) {
            return of(null);
          }
          this.setStatus(key, 'envoi');
          return this.api.uploadImage(file, '', target).pipe(
            map((image) => {
              this.setStatus(key, 'ok');
              // N'ajoute l'image à la grille que si elle correspond toujours à la vue affichée.
              if (this.view() === 'all' || this.view() === (target ?? 'none')) {
                this.images.update((list) => [image, ...list]);
              }
              return image;
            }),
            catchError((e: unknown) => {
              this.setStatus(key, 'erreur', apiErrorMessage(e, 'Envoi impossible.'));
              return of(null);
            }),
          );
        }, CONCURRENCY),
      )
      .subscribe({
        complete: () => {
          items.forEach((i) => this.files.delete(i.key));
          this.loadEvents(); // compteurs et couvertures
        },
      });
  }

  protected clearQueue(): void {
    this.queue().forEach((i) => URL.revokeObjectURL(i.preview));
    this.queue.set([]);
    this.rejected.set([]);
  }

  protected label(status: UploadStatus): string {
    return { attente: 'En attente', envoi: 'Envoi…', ok: 'Ajoutée', erreur: 'Erreur' }[status];
  }

  protected saveCaption(image: GalleryImage, caption: string): void {
    this.api
      .updateCaption(image.id, caption)
      .subscribe((updated) =>
        this.images.update((list) => list.map((i) => (i.id === updated.id ? updated : i))),
      );
  }

  protected remove(image: GalleryImage): void {
    if (confirm('Supprimer définitivement cette image ?')) {
      this.api.deleteImage(image.id).subscribe(() => {
        this.images.update((list) => list.filter((i) => i.id !== image.id));
        this.loadEvents();
      });
    }
  }

  private setStatus(key: number, status: UploadStatus, error?: string): void {
    this.queue.update((q) => q.map((i) => (i.key === key ? { ...i, status, error } : i)));
  }

  private upsertEvent(event: AdminGalleryEvent): void {
    this.events.update((list) => {
      const exists = list.some((e) => e.id === event.id);
      const next = exists ? list.map((e) => (e.id === event.id ? event : e)) : [event, ...list];
      return [...next].sort((a, b) => b.date.localeCompare(a.date));
    });
  }

  private loadEvents(): void {
    this.api.galleryEvents().subscribe((events) => this.events.set(events));
  }

  private loadImages(): void {
    const view = this.view();
    const filter = view === 'all' ? undefined : view;
    this.api.gallery(filter).subscribe((images) => {
      if (this.view() === view) {
        this.images.set(images);
      }
    });
  }
}

function today(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

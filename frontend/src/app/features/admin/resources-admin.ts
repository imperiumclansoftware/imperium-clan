import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, from, mergeMap, of, tap } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminResource, ResourceCategory } from '../../core/api/models';
import { DropZone } from '../../shared/drop-zone';
import { BANNER_FORMATS } from '../member/banner';
import { RouterLink } from '@angular/router';

/** Mêmes règles que le serveur (ResourceStorage) : vérification indicative, le serveur reste seul juge. */
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf', 'zip'];
const MAX_SIZE = 30 * 1024 * 1024;

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  graphics: 'Ressources graphiques',
  social: 'Réseaux sociaux',
};

interface Upload {
  readonly name: string;
  readonly status: 'envoi' | 'ok' | 'erreur';
  readonly error?: string;
}

@Component({
  selector: 'app-resources-admin',
  imports: [FormsModule, RouterLink, DropZone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Ressources membres</h1>
      <p class="secondaire">
        Fichiers téléchargeables par les membres connectés, dans leur espace
        <a routerLink="/ressources">Ressources</a>.
      </p>
    </header>

    <section class="raccourcis" aria-label="Générateurs et espace membre">
      @for (f of formats; track f.id) {
        <a
          class="carte raccourci"
          routerLink="/ressources/banniere"
          [queryParams]="{ format: f.id }"
        >
          <span class="libelle">Générateur</span>
          <strong>{{ f.short }}</strong>
          <span class="secondaire"
            >{{ f.width }} × {{ f.height }} px, pseudo et sceau du membre</span
          >
        </a>
      }
      <a class="carte raccourci" routerLink="/ressources">
        <span class="libelle">Aperçu</span>
        <strong>Espace membre</strong>
        <span class="secondaire">La page telle que les membres la voient</span>
      </a>
    </section>

    <section class="carte ajout" aria-labelledby="ajout-titre">
      <h2 id="ajout-titre">Ajouter des fichiers</h2>
      <div class="champ categorie">
        <label for="r-cat">Catégorie des fichiers ajoutés</label>
        <select id="r-cat" [ngModel]="category()" (ngModelChange)="category.set($event)">
          <option value="graphics">Ressources graphiques</option>
          <option value="social">Réseaux sociaux</option>
        </select>
      </div>
      <app-drop-zone
        accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.zip"
        title="Glisse tes fichiers ici"
        hint="PNG, JPEG, WebP, SVG, PDF ou ZIP · 30 Mo maximum par fichier · le titre reprend le nom du fichier"
        (files)="add($event)"
      />
      @if (uploads().length) {
        <p role="status">{{ summary() }}</p>
        <ul class="envois" role="list">
          @for (u of uploads(); track $index) {
            <li [attr.data-statut]="u.status">
              <span class="nom">{{ u.name }}</span>
              <span class="statut">{{
                u.status === 'envoi' ? 'Envoi…' : u.status === 'ok' ? 'Ajouté' : u.error
              }}</span>
            </li>
          }
        </ul>
      }
    </section>

    @for (group of groups(); track group.category) {
      <section class="groupe" [attr.aria-labelledby]="'g-' + group.category">
        <h2 [id]="'g-' + group.category">{{ group.label }} ({{ group.items.length }})</h2>
        @if (group.items.length === 0) {
          <p class="secondaire">Aucun fichier dans cette catégorie.</p>
        }
        <ul class="grille vignettes" role="list">
          @for (r of group.items; track r.id) {
            <li class="carte ressource" [class.edition]="editing() === r.id">
              <div class="apercu">
                @if (r.previewUrl) {
                  <img [src]="r.previewUrl" alt="" loading="lazy" />
                } @else {
                  <span class="code">{{ r.format }}</span>
                }
                @if (!r.published) {
                  <span class="badge">Masquée</span>
                }
              </div>
              @if (editing() === r.id) {
                <form
                  class="champs"
                  (submit)="
                    $event.preventDefault();
                    save(r, title.value, cat.value, desc.value, pos.valueAsNumber, pub.checked)
                  "
                >
                  <div class="ligne">
                    <div class="champ grand">
                      <label [for]="'t-' + r.id">Titre</label>
                      <input
                        #title
                        [id]="'t-' + r.id"
                        type="text"
                        [value]="r.title"
                        maxlength="120"
                        required
                      />
                    </div>
                    <div class="champ">
                      <label [for]="'c-' + r.id">Catégorie</label>
                      <select #cat [id]="'c-' + r.id">
                        <option value="graphics" [selected]="r.category === 'graphics'">
                          Graphique
                        </option>
                        <option value="social" [selected]="r.category === 'social'">
                          Réseaux sociaux
                        </option>
                      </select>
                    </div>
                    <div class="champ petit">
                      <label [for]="'p-' + r.id">Ordre</label>
                      <input
                        #pos
                        [id]="'p-' + r.id"
                        type="number"
                        [value]="r.position"
                        min="0"
                        max="1000"
                      />
                    </div>
                  </div>
                  <div class="champ">
                    <label [for]="'d-' + r.id">Description</label>
                    <input
                      #desc
                      [id]="'d-' + r.id"
                      type="text"
                      [value]="r.description"
                      maxlength="1000"
                    />
                  </div>
                  <label class="case"
                    ><input #pub type="checkbox" [checked]="r.published" /> Visible par les
                    membres</label
                  >
                  <div class="ligne">
                    <button type="submit" class="btn btn-principal btn-petit">Enregistrer</button>
                    <button
                      type="button"
                      class="btn btn-secondaire btn-petit"
                      (click)="editing.set(null)"
                    >
                      Annuler
                    </button>
                    <button type="button" class="btn btn-danger btn-petit" (click)="remove(r)">
                      Supprimer
                    </button>
                  </div>
                </form>
              } @else {
                <div class="resume">
                  <h3 [title]="r.title">{{ r.title }}</h3>
                  <p class="code secondaire">{{ r.format }} · {{ size(r.size) }}</p>
                </div>
                <div class="ligne actions">
                  <button
                    type="button"
                    class="btn btn-secondaire btn-petit"
                    (click)="edit(r)"
                    [attr.aria-label]="'Modifier ' + r.title"
                  >
                    Modifier
                  </button>
                  <a
                    [href]="r.downloadUrl"
                    download
                    class="lien"
                    [attr.aria-label]="'Télécharger ' + r.title"
                    >Télécharger</a
                  >
                  @if (saved() === r.id) {
                    <span class="succes" role="status">Enregistré.</span>
                  }
                </div>
              }
            </li>
          }
        </ul>
      </section>
    }
    @if (error()) {
      <p class="erreur" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .ajout {
      margin-bottom: var(--imp-e-6);
      gap: var(--imp-e-4);
    }
    .categorie {
      max-width: 320px;
    }
    .envois {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-1);
      max-height: 260px;
      overflow-y: auto;
      font-size: var(--imp-taille-s);
    }
    .envois li {
      display: flex;
      justify-content: space-between;
      gap: var(--imp-e-3);
      padding: var(--imp-e-2) var(--imp-e-3);
      border: 1px solid var(--imp-trait);
      border-radius: var(--imp-rayon-s);
    }
    .envois .nom {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .envois [data-statut='ok'] .statut {
      color: var(--imp-ics);
    }
    .envois [data-statut='erreur'] {
      border-color: var(--imp-icg);
    }
    .envois [data-statut='erreur'] .statut {
      color: var(--imp-icg);
    }
    .raccourcis {
      display: grid;
      gap: var(--imp-e-4);
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
      margin-bottom: var(--imp-e-6);
    }
    .raccourci {
      gap: var(--imp-e-1);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s;
    }
    .raccourci:hover,
    .raccourci:focus-visible {
      border-color: var(--accent, var(--imp-ivoire));
    }
    .groupe {
      display: grid;
      gap: var(--imp-e-3);
      margin-bottom: var(--imp-e-7);
    }
    .vignettes {
      list-style: none;
      margin: 0;
      padding: 0;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      align-items: start;
    }
    .ressource {
      gap: var(--imp-e-3);
      padding: var(--imp-e-3);
      min-width: 0;
    }
    /* Éléments de grille : sans min-width 0, un titre sur une ligne élargirait la carte au-delà de sa colonne */
    .ressource > * {
      min-width: 0;
    }
    /* Formulaire ouvert : la carte prend toute la largeur, aperçu à gauche */
    .ressource.edition {
      grid-column: 1 / -1;
    }
    @media (min-width: 900px) {
      .ressource.edition {
        grid-template-columns: 200px 1fr;
        align-items: start;
      }
    }
    .resume h3 {
      font-size: var(--imp-taille-s);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .resume p {
      font-size: var(--imp-taille-xs, 0.75rem);
    }
    .actions {
      gap: var(--imp-e-2);
      align-items: center;
    }
    .apercu {
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
    .apercu img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .badge {
      position: absolute;
      top: var(--imp-e-2);
      left: var(--imp-e-2);
      padding: 2px var(--imp-e-2);
      border-radius: var(--imp-rayon-pastille);
      background: var(--imp-noir);
      color: var(--imp-ivoire);
      font-size: var(--imp-taille-s);
      font-weight: 600;
    }
    .champs {
      display: grid;
      gap: var(--imp-e-3);
    }
    .champs .ligne {
      align-items: end;
    }
    .grand {
      flex: 1;
      min-width: 220px;
    }
    .petit {
      width: 110px;
    }
    .lien {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--imp-gris-sombre);
    }
  `,
})
export class ResourcesAdmin {
  private readonly api = inject(AdminApi);

  protected readonly category = signal<ResourceCategory>('graphics');
  protected readonly resources = signal<AdminResource[]>([]);
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  /** Ressource dont le formulaire est ouvert (une à la fois) */
  protected readonly editing = signal<string | null>(null);
  protected readonly formats = BANNER_FORMATS;

  protected readonly groups = computed(() =>
    (Object.keys(CATEGORY_LABELS) as ResourceCategory[]).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: this.resources().filter((r) => r.category === category),
    })),
  );

  protected readonly summary = computed(() => {
    const u = this.uploads();
    const pending = u.filter((i) => i.status === 'envoi').length;
    const ok = u.filter((i) => i.status === 'ok').length;
    const failed = u.filter((i) => i.status === 'erreur').length;
    return pending
      ? `Envoi en cours : ${u.length - pending} / ${u.length}…`
      : `${ok} fichier(s) ajouté(s)` + (failed ? `, ${failed} en erreur.` : '.');
  });

  constructor() {
    this.load();
  }

  protected add(files: File[]): void {
    const category = this.category();
    const start = this.uploads().length;
    this.uploads.update((u) => [
      ...u,
      ...files.map((f): Upload => ({ name: f.name, status: 'envoi' })),
    ]);
    from(files.map((file, i) => ({ file, index: start + i })))
      .pipe(
        mergeMap(({ file, index }) => {
          const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
          if (!EXTENSIONS.includes(extension) || file.size > MAX_SIZE) {
            this.setUpload(index, 'erreur', 'Format non accepté ou plus de 30 Mo.');
            return of(null);
          }
          return this.api.uploadResource(file, category).pipe(
            tap((resource) => {
              this.setUpload(index, 'ok');
              this.resources.update((list) => [...list, resource]);
            }),
            catchError((e: unknown) => {
              this.setUpload(index, 'erreur', apiErrorMessage(e, 'Envoi impossible.'));
              return of(null);
            }),
          );
        }, 3),
      )
      .subscribe();
  }

  protected save(
    r: AdminResource,
    title: string,
    category: string,
    description: string,
    position: number,
    published: boolean,
  ): void {
    this.error.set(null);
    this.api
      .updateResource(r.id, {
        title,
        category: category === 'social' ? 'social' : 'graphics',
        description,
        position: Number.isFinite(position) ? position : 0,
        published,
      })
      .subscribe({
        next: (updated) => {
          this.resources.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
          this.editing.set(null);
          this.saved.set(updated.id);
        },
        error: (e: unknown) => this.error.set(apiErrorMessage(e)),
      });
  }

  protected edit(r: AdminResource): void {
    this.saved.set(null);
    this.error.set(null);
    this.editing.set(r.id);
  }

  protected remove(r: AdminResource): void {
    if (confirm(`Supprimer « ${r.title} » ?`)) {
      this.api
        .deleteResource(r.id)
        .subscribe(() => this.resources.update((list) => list.filter((i) => i.id !== r.id)));
    }
  }

  protected size(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
      : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  }

  private setUpload(index: number, status: Upload['status'], error?: string): void {
    this.uploads.update((u) =>
      u.map((item, i) => (i === index ? { ...item, status, error } : item)),
    );
  }

  private load(): void {
    this.api.resources().subscribe((items) => this.resources.set(items));
  }
}

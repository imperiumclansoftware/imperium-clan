import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

let nextId = 0;

/**
 * Zone de dépôt de fichiers (glisser-déposer ou clic), utilisable au clavier : le vrai <input type="file">
 * reste focalisable, la zone est son <label>. Émet la liste des fichiers ; le tri et l'envoi restent au parent.
 */
@Component({
  selector: 'app-drop-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #picker
      [id]="inputId"
      class="visually-hidden"
      type="file"
      [multiple]="multiple()"
      [accept]="accept()"
      (change)="emit(picker.files); picker.value = ''"
    />
    <label
      [for]="inputId"
      class="depot"
      [class.survol]="dragging()"
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
      <span class="depot-titre">{{ title() }}</span>
      <span class="secondaire">{{
        multiple()
          ? 'ou clique pour les choisir — plusieurs à la fois'
          : 'ou clique pour la choisir'
      }}</span>
      <span class="aide">{{ hint() }}</span>
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    .depot {
      display: grid;
      justify-items: center;
      gap: var(--imp-e-2);
      text-align: center;
      padding: var(--imp-e-7) var(--imp-e-4);
      border: 2px dashed var(--imp-trait-fort);
      border-radius: var(--imp-rayon-l);
      background: var(--imp-noir);
      color: var(--imp-gris-sombre);
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
    }
    .depot:hover,
    .depot.survol {
      border-color: var(--imp-ivoire);
      background: var(--imp-panneau-2);
      color: var(--imp-ivoire);
    }
    input:focus-visible + .depot {
      outline: 2px solid var(--imp-ivoire);
      outline-offset: 3px;
    }
    .depot-titre {
      font-size: var(--imp-taille-l);
      font-weight: 600;
      color: var(--imp-ivoire);
    }
    .aide {
      font-size: var(--imp-taille-s);
    }
  `,
})
export class DropZone {
  readonly accept = input('');
  readonly title = input('Glisse tes fichiers ici');
  readonly hint = input('');
  readonly multiple = input(true);
  readonly files = output<File[]>();

  protected readonly inputId = `depot-${nextId++}`;
  protected readonly dragging = signal(false);

  protected onDragOver(event: DragEvent): void {
    event.preventDefault(); // autorise le dépôt (sinon le navigateur ouvre le fichier)
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.emit(event.dataTransfer?.files ?? null);
  }

  protected emit(list: FileList | null): void {
    const all = Array.from(list ?? []);
    const files = this.multiple() ? all : all.slice(0, 1);
    if (files.length) {
      this.files.emit(files);
    }
  }
}

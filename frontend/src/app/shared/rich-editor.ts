import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ChainedCommands, Editor, JSONContent } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { RichDoc } from '../core/api/models';

const EMPTY: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

type Action =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'h2'
  | 'h3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'undo'
  | 'redo';

/**
 * Éditeur WYSIWYG des actualités (Tiptap / ProseMirror). Le contenu circule en JSON, jamais en HTML :
 * compatible avec la CSP Trusted Types (pas de DOMParser ni d'injection de styles : injectCSS désactivé).
 * Seules les mises en forme acceptées par le serveur (App\News\RichText) sont proposées.
 */
@Component({
  selector: 'app-rich-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichEditor), multi: true },
  ],
  template: `
    <div class="editeur" [class.desactive]="disabled()">
      <div
        class="outils"
        role="toolbar"
        [attr.aria-label]="'Mise en forme : ' + label()"
        [attr.aria-controls]="editorId"
      >
        @for (group of groups; track $index) {
          <div class="groupe">
            @for (b of group; track b.action) {
              <button
                type="button"
                class="outil"
                [attr.aria-pressed]="b.toggle ? isActive(b.action) : null"
                [attr.aria-label]="b.label"
                [title]="b.label"
                [disabled]="disabled()"
                (click)="run(b.action)"
              >
                <span aria-hidden="true" [class]="'icone ' + b.action">{{ b.text }}</span>
              </button>
            }
          </div>
        }
        <div class="groupe">
          <button
            type="button"
            class="outil"
            [attr.aria-pressed]="isActive('link')"
            aria-label="Lien"
            title="Lien"
            [disabled]="disabled()"
            (click)="toggleLinkForm()"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      </div>

      @if (linkFormOpen()) {
        <div class="lien-form">
          <label [for]="editorId + '-lien'">Adresse du lien</label>
          <input
            #linkInput
            [id]="editorId + '-lien'"
            type="url"
            placeholder="https://"
            [value]="linkValue()"
            (keydown.enter)="$event.preventDefault(); applyLink(linkInput.value)"
            (keydown.escape)="linkFormOpen.set(false)"
          />
          <button
            type="button"
            class="btn btn-secondaire btn-petit"
            (click)="applyLink(linkInput.value)"
          >
            Appliquer
          </button>
          @if (isActive('link')) {
            <button type="button" class="btn btn-secondaire btn-petit" (click)="applyLink('')">
              Retirer
            </button>
          }
          @if (linkError()) {
            <span class="erreur" role="alert">{{ linkError() }}</span>
          }
        </div>
      }

      <div #host class="zone"></div>
    </div>
  `,
  styles: `
    .editeur {
      border: 1px solid var(--imp-trait-fort);
      border-radius: var(--imp-rayon-m);
      background: var(--imp-noir);
    }
    .editeur:focus-within {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .editeur.desactive {
      opacity: 0.6;
    }
    .editeur .outils {
      display: flex;
      flex-wrap: wrap;
      gap: var(--imp-e-2);
      padding: var(--imp-e-2);
      border-bottom: 1px solid var(--imp-trait);
      position: sticky;
      top: 0;
      background: var(--imp-panneau);
      border-radius: var(--imp-rayon-m) var(--imp-rayon-m) 0 0;
      z-index: 1;
    }
    .editeur .groupe {
      display: flex;
      gap: 2px;
      padding-right: var(--imp-e-2);
      border-right: 1px solid var(--imp-trait);
    }
    .editeur .groupe:last-child {
      border-right: 0;
    }
    .editeur .outil {
      display: inline-grid;
      place-items: center;
      min-width: 40px;
      height: 40px;
      padding: 0 var(--imp-e-2);
      background: transparent;
      color: var(--imp-gris-sombre);
      border: 1px solid transparent;
      border-radius: var(--imp-rayon-s);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .editeur .outil:hover:not(:disabled) {
      color: var(--imp-ivoire);
      background: var(--imp-panneau-2);
    }
    .editeur .outil[aria-pressed='true'] {
      color: var(--imp-noir);
      background: var(--accent);
    }
    .editeur .icone.italic {
      font-style: italic;
      font-family: Georgia, serif;
    }
    .editeur .icone.underline {
      text-decoration: underline;
    }
    .editeur .icone.strike {
      text-decoration: line-through;
    }
    .editeur .lien-form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--imp-e-2);
      padding: var(--imp-e-2) var(--imp-e-3);
      border-bottom: 1px solid var(--imp-trait);
    }
    .editeur .lien-form label {
      font-size: var(--imp-taille-s);
      font-weight: 600;
    }
    .editeur .lien-form input {
      flex: 1;
      min-width: 220px;
      min-height: 40px;
    }

    /* Styles de ProseMirror (injectCSS est désactivé pour respecter la CSP). */
    .editeur .ProseMirror {
      min-height: 320px;
      padding: var(--imp-e-4);
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 1.0625rem;
      line-height: 1.65;
      display: grid;
      gap: var(--imp-e-3);
      align-content: start;
    }
    .editeur .ProseMirror :is(p, h2, h3, ul, ol, blockquote) {
      margin: 0;
    }
    .editeur .ProseMirror h2 {
      font-size: var(--imp-taille-l);
      font-weight: 700;
    }
    .editeur .ProseMirror h3 {
      font-size: var(--imp-taille-m);
      font-weight: 700;
    }
    .editeur .ProseMirror :is(ul, ol) {
      padding-left: var(--imp-e-5);
    }
    .editeur .ProseMirror blockquote {
      border-left: 3px solid var(--accent);
      padding-left: var(--imp-e-4);
      color: var(--imp-gris-sombre);
      font-style: italic;
    }
    .editeur .ProseMirror a {
      color: var(--imp-ivoire);
      text-decoration-color: var(--accent);
    }
    .editeur .ProseMirror hr {
      border: 0;
      border-top: 1px solid var(--imp-trait);
    }
    .editeur .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--imp-gris-sombre);
      float: left;
      height: 0;
      pointer-events: none;
    }
    .editeur .ProseMirror-gapcursor {
      display: none;
      pointer-events: none;
      position: absolute;
    }
    .editeur .ProseMirror-focused .ProseMirror-gapcursor {
      display: block;
    }
  `,
})
export class RichEditor implements ControlValueAccessor, AfterViewInit, OnDestroy {
  readonly label = input('Texte');
  readonly placeholder = input('Écris ton actualité…');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private editor: Editor | null = null;
  private pending: RichDoc = EMPTY;
  private onChange: (value: RichDoc) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly editorId = `editeur-${Math.floor(performance.now() * 1000).toString(36)}`;
  protected readonly disabled = signal(false);
  /** Incrémenté à chaque transaction : recalcule l'état des boutons. */
  private readonly version = signal(0);
  protected readonly linkFormOpen = signal(false);
  protected readonly linkValue = signal('');
  protected readonly linkError = signal<string | null>(null);

  protected readonly groups: readonly (readonly {
    action: Action;
    label: string;
    text: string;
    toggle: boolean;
  }[])[] = [
    [
      { action: 'bold', label: 'Gras', text: 'G', toggle: true },
      { action: 'italic', label: 'Italique', text: 'I', toggle: true },
      { action: 'underline', label: 'Souligné', text: 'S', toggle: true },
      { action: 'strike', label: 'Barré', text: 'B', toggle: true },
    ],
    [
      { action: 'h2', label: 'Intertitre', text: 'T1', toggle: true },
      { action: 'h3', label: 'Sous-intertitre', text: 'T2', toggle: true },
    ],
    [
      { action: 'bulletList', label: 'Liste à puces', text: '•', toggle: true },
      { action: 'orderedList', label: 'Liste numérotée', text: '1.', toggle: true },
      { action: 'blockquote', label: 'Citation', text: '«', toggle: true },
    ],
    [
      { action: 'undo', label: 'Annuler', text: '↶', toggle: false },
      { action: 'redo', label: 'Rétablir', text: '↷', toggle: false },
    ],
  ];

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.host().nativeElement,
      injectCSS: false,
      editable: !this.disabled(),
      content: this.pending as JSONContent,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          code: false,
          codeBlock: false,
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
            protocols: ['http', 'https', 'mailto'],
            HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null },
          },
        }),
        Placeholder.configure({ placeholder: this.placeholder() }),
      ],
      editorProps: {
        attributes: {
          id: this.editorId,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': this.label(),
        },
      },
      onUpdate: ({ editor }) => this.onChange(editor.getJSON() as RichDoc),
      onTransaction: () => this.version.update((v) => v + 1),
      onBlur: () => this.onTouched(),
    });
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  writeValue(value: RichDoc | null): void {
    this.pending = value ?? EMPTY;
    this.editor?.commands.setContent(this.pending as JSONContent, { emitUpdate: false });
  }

  registerOnChange(fn: (value: RichDoc) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    this.editor?.setEditable(!disabled);
  }

  protected isActive(action: Action | 'link'): boolean {
    this.version(); // dépendance : réévalué à chaque transaction
    const e = this.editor;
    if (!e) {
      return false;
    }
    switch (action) {
      case 'h2':
        return e.isActive('heading', { level: 2 });
      case 'h3':
        return e.isActive('heading', { level: 3 });
      case 'undo':
      case 'redo':
        return false;
      default:
        return e.isActive(action);
    }
  }

  protected run(action: Action): void {
    const chain = this.editor?.chain().focus();
    if (!chain) {
      return;
    }
    const commands: Record<Action, () => ChainedCommands> = {
      bold: () => chain.toggleBold(),
      italic: () => chain.toggleItalic(),
      underline: () => chain.toggleUnderline(),
      strike: () => chain.toggleStrike(),
      h2: () => chain.toggleHeading({ level: 2 }),
      h3: () => chain.toggleHeading({ level: 3 }),
      bulletList: () => chain.toggleBulletList(),
      orderedList: () => chain.toggleOrderedList(),
      blockquote: () => chain.toggleBlockquote(),
      undo: () => chain.undo(),
      redo: () => chain.redo(),
    };
    commands[action]().run();
  }

  /** Sélection mémorisée à l'ouverture du champ de lien (le focus part dans le champ). */
  private linkRange: { from: number; to: number } | null = null;

  protected toggleLinkForm(): void {
    const open = !this.linkFormOpen();
    const selection = this.editor?.state.selection;
    this.linkRange = open && selection ? { from: selection.from, to: selection.to } : null;
    this.linkError.set(null);
    this.linkValue.set(open ? String(this.editor?.getAttributes('link')['href'] ?? '') : '');
    this.linkFormOpen.set(open);
  }

  /** Applique (ou retire si vide) le lien sur la sélection. Mêmes protocoles que le serveur. */
  protected applyLink(raw: string): void {
    const value = raw.trim();
    let chain = this.editor?.chain().focus();
    if (chain && this.linkRange) {
      chain = chain.setTextSelection(this.linkRange);
    }
    chain = chain?.extendMarkRange('link');
    if (!chain) {
      return;
    }
    if (value === '') {
      chain.unsetLink().run();
      this.linkFormOpen.set(false);
      return;
    }
    const href = /^(https?:\/\/|mailto:)/i.test(value) ? value : `https://${value}`;
    if (!isSafeHref(href)) {
      this.linkError.set('Adresse invalide : utilise un lien https:// ou mailto:.');
      return;
    }
    chain.setLink({ href }).run();
    this.linkFormOpen.set(false);
  }
}

export function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) && !/\s/.test(href);
  } catch {
    return false;
  }
}

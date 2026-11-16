import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RichDoc } from '../core/api/models';

/**
 * Rendu du texte riche des actualités avec des templates Angular : aucun innerHTML, chaque nœud et
 * chaque marque de la liste blanche devient un élément. Les liens passent par le binding [href]
 * (assaini par Angular) et s'ouvrent dans un nouvel onglet sans transmettre l'origine.
 */
@Component({
  selector: 'app-rich-text',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #blocks let-list>
      @for (n of list; track $index) {
        @switch (n.type) {
          @case ('paragraph') {
            <p>
              <ng-container *ngTemplateOutlet="inline; context: { $implicit: n.content ?? [] }" />
            </p>
          }
          @case ('heading') {
            @if (n.attrs?.level === 3) {
              <h3>
                <ng-container *ngTemplateOutlet="inline; context: { $implicit: n.content ?? [] }" />
              </h3>
            } @else {
              <h2>
                <ng-container *ngTemplateOutlet="inline; context: { $implicit: n.content ?? [] }" />
              </h2>
            }
          }
          @case ('bulletList') {
            <ul>
              <ng-container *ngTemplateOutlet="blocks; context: { $implicit: n.content ?? [] }" />
            </ul>
          }
          @case ('orderedList') {
            <ol>
              <ng-container *ngTemplateOutlet="blocks; context: { $implicit: n.content ?? [] }" />
            </ol>
          }
          @case ('listItem') {
            <li>
              <ng-container *ngTemplateOutlet="blocks; context: { $implicit: n.content ?? [] }" />
            </li>
          }
          @case ('blockquote') {
            <blockquote>
              <ng-container *ngTemplateOutlet="blocks; context: { $implicit: n.content ?? [] }" />
            </blockquote>
          }
          @case ('horizontalRule') {
            <hr />
          }
        }
      }
    </ng-template>

    <ng-template #inline let-list>
      @for (n of list; track $index) {
        @if (n.type === 'hardBreak') {
          <br />
        } @else if (n.type === 'text') {
          <ng-container
            *ngTemplateOutlet="marked; context: { $implicit: n.text, marks: n.marks ?? [], i: 0 }"
          />
        }
      }
    </ng-template>

    <ng-template #marked let-text let-marks="marks" let-i="i">
      @if (i >= marks.length) {
        <!-- Texte dans un ng-container : aucun espace parasite autour (les blancs du template sont supprimés). -->
        <ng-container>{{ text }}</ng-container>
      } @else {
        @switch (marks[i].type) {
          @case ('bold') {
            <strong
              ><ng-container
                *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            /></strong>
          }
          @case ('italic') {
            <em
              ><ng-container
                *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            /></em>
          }
          @case ('underline') {
            <u
              ><ng-container
                *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            /></u>
          }
          @case ('strike') {
            <s
              ><ng-container
                *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            /></s>
          }
          @case ('link') {
            <a [href]="marks[i].attrs?.href" target="_blank" rel="noopener noreferrer nofollow"
              ><ng-container
                *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            /></a>
          }
          @default {
            <ng-container
              *ngTemplateOutlet="marked; context: { $implicit: text, marks: marks, i: i + 1 }"
            />
          }
        }
      }
    </ng-template>

    <div class="texte-riche">
      <ng-container *ngTemplateOutlet="blocks; context: { $implicit: doc().content }" />
    </div>
  `,
  styles: `
    .texte-riche {
      display: grid;
      gap: var(--imp-e-4);
      max-width: 68ch;
      font-size: 1.0625rem;
      line-height: 1.65;
    }
    .texte-riche ::ng-deep :is(p, h2, h3, ul, ol, blockquote) {
      margin: 0;
    }
    .texte-riche ::ng-deep h2 {
      font-size: var(--imp-taille-l);
      font-weight: 700;
      margin-top: var(--imp-e-3);
    }
    .texte-riche ::ng-deep h3 {
      font-size: var(--imp-taille-m);
      font-weight: 700;
      margin-top: var(--imp-e-2);
    }
    .texte-riche ::ng-deep :is(ul, ol) {
      padding-left: var(--imp-e-5);
      display: grid;
      gap: var(--imp-e-2);
    }
    .texte-riche ::ng-deep li > p {
      display: inline;
    }
    .texte-riche ::ng-deep blockquote {
      border-left: 3px solid var(--accent);
      padding-left: var(--imp-e-4);
      color: var(--imp-gris-sombre);
      font-style: italic;
    }
    .texte-riche ::ng-deep a {
      color: var(--imp-ivoire);
      text-decoration-color: var(--accent);
      text-underline-offset: 3px;
    }
    .texte-riche ::ng-deep hr {
      border: 0;
      border-top: 1px solid var(--imp-trait);
      width: 100%;
    }
  `,
})
export class RichText {
  readonly doc = input.required<RichDoc>();
}

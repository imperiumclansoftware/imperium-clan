import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { GalleryEventDetail } from '../../core/api/models';
import { PublicApi } from '../../core/api/public-api';
import { BranchPills } from '../../shared/branch-pills';
import { GalleryGrid } from '../../shared/gallery-grid';
import { ParagraphsPipe } from '../../shared/paragraphs';

type State =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error' }
  | { state: 'ok'; value: GalleryEventDetail };

@Component({
  selector: 'app-gallery-event',
  imports: [RouterLink, DatePipe, BranchPills, GalleryGrid, ParagraphsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <p class="retour"><a routerLink="/galerie">← Galerie</a></p>
      @let e = event();
      @if (e.state === 'loading') {
        <p class="secondaire" role="status">Chargement…</p>
      } @else if (e.state === 'missing') {
        <h1>Événement introuvable</h1>
        <p class="secondaire">Il a peut-être été retiré.</p>
      } @else if (e.state === 'error') {
        <p class="erreur" role="alert">Impossible de charger cet événement pour le moment.</p>
      } @else {
        <header class="page-entete">
          <p class="libelle">
            <time [attr.datetime]="e.value.date">{{ e.value.date | date: 'd MMMM y' }}</time> ·
            {{ e.value.imageCount }} photo{{ e.value.imageCount > 1 ? 's' : '' }}
          </p>
          <h1>{{ e.value.title }}</h1>
          @if (e.value.branches.length) {
            <app-branch-pills [branches]="e.value.branches" format="moyen" />
          }
          @if (e.value.description) {
            <div class="texte">
              @for (para of e.value.description | paragraphs; track $index) {
                <p class="secondaire">{{ para }}</p>
              }
            </div>
          }
        </header>
        @if (e.value.images.length) {
          <app-gallery-grid [images]="e.value.images" />
        } @else {
          <p class="secondaire">Les photos arrivent bientôt.</p>
        }
      }
    </div>
  `,
  styles: `
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
  `,
})
export class GalleryEventPage {
  private readonly api = inject(PublicApi);
  readonly slug = input.required<string>();

  protected readonly event = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        this.api.galleryEvent(slug).pipe(
          map((value): State => ({ state: 'ok', value })),
          catchError((e: unknown) =>
            of<State>(
              e instanceof HttpErrorResponse && e.status === 404
                ? { state: 'missing' }
                : { state: 'error' },
            ),
          ),
          startWith<State>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as State },
  );
}

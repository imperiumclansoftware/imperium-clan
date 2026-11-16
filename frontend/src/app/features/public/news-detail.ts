import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { News } from '../../core/api/models';
import { PublicApi } from '../../core/api/public-api';
import { BranchPills } from '../../shared/branch-pills';
import { NewsIllustration } from '../../shared/news-illustration';
import { RichText } from '../../shared/rich-text';

type State =
  { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; value: News };

@Component({
  selector: 'app-news-detail',
  imports: [RouterLink, DatePipe, BranchPills, NewsIllustration, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur etroit">
      <p class="retour"><a routerLink="/actualites">← Toutes les actualités</a></p>
      @let a = article();
      @if (a.state === 'loading') {
        <p class="secondaire" role="status">Chargement…</p>
      } @else if (a.state === 'missing') {
        <h1>Actualité introuvable</h1>
        <p class="secondaire">Elle a peut-être été retirée.</p>
      } @else if (a.state === 'error') {
        <p class="erreur" role="alert">Impossible de charger cette actualité pour le moment.</p>
      } @else {
        <article class="pile article">
          <header class="pile">
            <p class="libelle">
              @if (a.value.publishedAt; as date) {
                <time [attr.datetime]="date">{{ date | date: 'd MMMM y' }}</time> ·
              }
              {{ a.value.author }}
            </p>
            <h1>{{ a.value.title }}</h1>
            <p class="chapo">{{ a.value.excerpt }}</p>
            @if (a.value.branches.length) {
              <app-branch-pills [branches]="a.value.branches" format="moyen" />
            }
          </header>
          <app-news-illustration
            class="couverture"
            [src]="a.value.coverUrl"
            [branches]="a.value.branches"
            [lazy]="false"
            [large]="true"
          />
          <app-rich-text [doc]="a.value.content" />
        </article>
      }
    </div>
  `,
  styles: `
    .etroit {
      max-width: 820px;
      padding-top: var(--imp-e-6);
    }
    .retour a {
      color: var(--imp-gris-sombre);
      text-decoration: none;
      display: inline-flex;
      min-height: 44px;
      align-items: center;
    }
    .retour a:hover {
      color: var(--imp-ivoire);
    }
    .article {
      gap: var(--imp-e-5);
    }
    .chapo {
      font-size: var(--imp-taille-l);
      color: var(--imp-gris-sombre);
    }
    .couverture {
      border-radius: var(--imp-rayon-l);
    }
  `,
})
export class NewsDetail {
  private readonly api = inject(PublicApi);
  readonly slug = input.required<string>();

  private readonly state = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        this.api.article(slug).pipe(
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
  protected readonly article = computed(() => this.state());
}

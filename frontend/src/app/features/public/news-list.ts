import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PublicApi } from '../../core/api/public-api';
import { NewsSummary } from '../../core/api/models';
import { NewsCard } from '../../shared/news-card';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-news-list',
  imports: [NewsCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur">
      <header class="page-entete">
        <p class="libelle">Actualités</p>
        <h1>La chronique du clan</h1>
      </header>

      @if (items().length) {
        <div class="grille-l">
          @for (item of items(); track item.id) {
            <app-news-card [news]="item" />
          }
        </div>
      } @else if (!loading() && !error()) {
        <p class="secondaire">Pas encore d’actualité publiée.</p>
      }
      @if (error()) {
        <p class="erreur" role="alert">Impossible de charger les actualités pour le moment.</p>
      }
      @if (loading()) {
        <p class="secondaire" role="status">Chargement…</p>
      } @else if (hasMore()) {
        <button type="button" class="btn btn-secondaire plus" (click)="load()">
          Charger plus d’actualités
        </button>
      }
    </div>
  `,
  styles: `
    .plus {
      margin-top: var(--imp-e-5);
    }
  `,
})
export class NewsList {
  private readonly api = inject(PublicApi);
  private page = 0;

  protected readonly items = signal<NewsSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly hasMore = signal(true);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.news(this.page + 1, PAGE_SIZE).subscribe({
      next: (items) => {
        this.page++;
        this.items.update((current) => [...current, ...items]);
        this.hasMore.set(items.length === PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}

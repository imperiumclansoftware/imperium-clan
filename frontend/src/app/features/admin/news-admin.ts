import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api/admin-api';
import { NewsSummary } from '../../core/api/models';
import { BranchPills } from '../../shared/branch-pills';

@Component({
  selector: 'app-news-admin',
  imports: [RouterLink, DatePipe, BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ligne entete">
      <div class="pile">
        <p class="libelle">Administration</p>
        <h1>Actualités</h1>
      </div>
      <a routerLink="/admin/actualites/nouvelle" class="btn btn-principal">Nouvelle actualité</a>
    </header>

    <div class="defile">
      <table class="tableau">
        <thead>
          <tr>
            <th scope="col">Titre</th>
            <th scope="col">Statut</th>
            <th scope="col">Branches</th>
            <th scope="col">Auteur</th>
          </tr>
        </thead>
        <tbody>
          @for (item of news(); track item.id) {
            <tr>
              <td>
                <a [routerLink]="['/admin/actualites', item.id]">{{ item.title }}</a>
              </td>
              <td>
                {{ status(item) }}
                @if (item.publishedAt) {
                  <span class="secondaire">({{ item.publishedAt | date: 'd MMM y, HH:mm' }})</span>
                }
              </td>
              <td><app-branch-pills [branches]="item.branches" /></td>
              <td>{{ item.author }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="secondaire">Aucune actualité.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .entete {
      justify-content: space-between;
      margin-bottom: var(--imp-e-6);
    }
  `,
})
export class NewsAdmin {
  protected readonly news = signal<NewsSummary[]>([]);

  constructor() {
    inject(AdminApi)
      .news()
      .subscribe((items) => this.news.set(items));
  }

  protected status(item: NewsSummary): string {
    if (!item.publishedAt) {
      return 'Brouillon';
    }
    return new Date(item.publishedAt) > new Date() ? 'Programmée' : 'Publiée';
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsSummary } from '../core/api/models';
import { BranchPills } from './branch-pills';
import { NewsIllustration } from './news-illustration';

@Component({
  selector: 'app-news-card',
  imports: [RouterLink, DatePipe, BranchPills, NewsIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte carte-lien actu">
      <!-- Toujours une illustration (image envoyée ou remplacement) : cartes de hauteur homogène. -->
      <app-news-illustration
        class="couverture"
        [src]="news().coverUrl"
        [branches]="news().branches"
      />
      <p class="libelle">
        @if (news().publishedAt; as date) {
          <time [attr.datetime]="date">{{ date | date: 'd MMMM y' }}</time>
        }
      </p>
      <h3>
        <a [routerLink]="['/actualites', news().slug]" class="lien-etendu">{{ news().title }}</a>
      </h3>
      <p class="secondaire">{{ news().excerpt }}</p>
      @if (news().branches.length) {
        <app-branch-pills [branches]="news().branches" />
      }
    </article>
  `,
  styles: `
    .actu {
      position: relative;
    }
    .couverture {
      margin: calc(-1 * var(--imp-e-5)) calc(-1 * var(--imp-e-5)) var(--imp-e-2);
      border-radius: var(--imp-rayon-l) var(--imp-rayon-l) 0 0;
    }
    h3 {
      font-size: var(--imp-taille-l);
      line-height: 1.3;
    }
    .lien-etendu {
      text-decoration: none;
    }
    .lien-etendu::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--imp-rayon-l);
    }
    .lien-etendu:focus-visible {
      outline: none;
    }
    .lien-etendu:focus-visible::after {
      outline: 2px solid var(--imp-ivoire);
      outline-offset: 3px;
    }
  `,
})
export class NewsCard {
  readonly news = input.required<NewsSummary>();
}

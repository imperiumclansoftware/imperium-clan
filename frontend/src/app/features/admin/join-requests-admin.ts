import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { JoinRequest, JoinRequestStatus } from '../../core/api/models';
import { BranchPills } from '../../shared/branch-pills';

@Component({
  selector: 'app-join-requests-admin',
  imports: [DatePipe, BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Candidatures</h1>
      <p class="secondaire">
        Données personnelles : à ne pas partager hors du clan. Supprimées automatiquement après 6
        mois.
      </p>
    </header>

    <div class="pile">
      @for (r of requests(); track r.id) {
        <article class="carte">
          <div class="ligne entre">
            <h2>{{ r.pseudo }}</h2>
            <span class="pastille" [style.--pastille]="color(r.status)">{{ label(r.status) }}</span>
          </div>
          <p class="secondaire">
            <time [attr.datetime]="r.createdAt">{{ r.createdAt | date: 'd MMM y, HH:mm' }}</time> ·
            <a [href]="'mailto:' + r.email">{{ r.email }}</a>
            @if (r.discord) {
              · Discord : <span class="code">{{ r.discord }}</span>
            }
          </p>
          <app-branch-pills [branches]="r.branches" format="moyen" />
          <p class="message">{{ r.message }}</p>
          <div class="ligne">
            @if (r.status !== 'accepted') {
              <button
                type="button"
                class="btn btn-secondaire btn-petit"
                (click)="decide(r, 'accepted')"
              >
                Accepter
              </button>
            }
            @if (r.status !== 'rejected') {
              <button
                type="button"
                class="btn btn-secondaire btn-petit"
                (click)="decide(r, 'rejected')"
              >
                Refuser
              </button>
            }
            @if (r.status !== 'new') {
              <button type="button" class="btn btn-secondaire btn-petit" (click)="decide(r, 'new')">
                Remettre à traiter
              </button>
            }
            <button type="button" class="btn btn-danger btn-petit" (click)="remove(r)">
              Supprimer
            </button>
          </div>
        </article>
      } @empty {
        <p class="secondaire">Aucune candidature.</p>
      }
    </div>
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .entre {
      justify-content: space-between;
    }
    .message {
      white-space: pre-line;
    }
  `,
})
export class JoinRequestsAdmin {
  private readonly api = inject(AdminApi);
  protected readonly requests = signal<JoinRequest[]>([]);

  constructor() {
    this.load();
  }

  protected label(status: JoinRequestStatus): string {
    return { new: 'À traiter', accepted: 'Acceptée', rejected: 'Refusée' }[status];
  }

  protected color(status: JoinRequestStatus): string {
    return { new: 'var(--imp-icf)', accepted: 'var(--imp-ics)', rejected: 'var(--imp-trait-fort)' }[
      status
    ];
  }

  protected decide(r: JoinRequest, status: JoinRequestStatus): void {
    this.api.decide(r.id, status).subscribe(() => this.load());
  }

  protected remove(r: JoinRequest): void {
    if (confirm(`Supprimer la candidature de ${r.pseudo} ?`)) {
      this.api.deleteJoinRequest(r.id).subscribe(() => this.load());
    }
  }

  private load(): void {
    this.api.joinRequests().subscribe((items) => this.requests.set(items));
  }
}

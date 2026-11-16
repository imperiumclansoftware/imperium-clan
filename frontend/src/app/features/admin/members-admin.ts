import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminMember } from '../../core/api/models';
import { BranchPills } from '../../shared/branch-pills';

@Component({
  selector: 'app-members-admin',
  imports: [DatePipe, BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ligne entete">
      <div class="pile">
        <p class="libelle">Administration</p>
        <h1>Membres</h1>
        <p class="secondaire">
          Synchronisés depuis Conclave : seuls les membres qui l’ont accepté apparaissent sur le
          portail.
        </p>
      </div>
      <button
        type="button"
        class="btn btn-principal"
        (click)="sync()"
        [disabled]="!configured() || pending()"
      >
        Synchroniser maintenant
      </button>
    </header>

    @if (!configured()) {
      <p class="alerte">
        La synchronisation n’est pas encore configurée : il faut définir
        <span class="code">CONCLAVE_URL</span>, <span class="code">CONCLAVE_CLIENT_ID</span> et
        <span class="code">CONCLAVE_CLIENT_SECRET</span> côté serveur.
      </p>
    }
    @if (message()) {
      <p class="succes" role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p class="erreur" role="alert">{{ error() }}</p>
    }

    <div class="defile">
      <table class="tableau">
        <thead>
          <tr>
            <th scope="col">Pseudo</th>
            <th scope="col">Titre</th>
            <th scope="col">Branches</th>
            <th scope="col">Dernière synchronisation</th>
          </tr>
        </thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr>
              <td>{{ m.pseudo }}</td>
              <td>{{ m.title ?? '—' }}</td>
              <td><app-branch-pills [branches]="m.branches" /></td>
              <td>
                <time [attr.datetime]="m.syncedAt">{{ m.syncedAt | date: 'd MMM y, HH:mm' }}</time>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="secondaire">Aucun membre.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .entete {
      justify-content: space-between;
      align-items: end;
      margin-bottom: var(--imp-e-6);
    }
    .alerte,
    .succes,
    .erreur {
      margin-bottom: var(--imp-e-4);
    }
  `,
})
export class MembersAdmin {
  private readonly api = inject(AdminApi);

  protected readonly members = signal<AdminMember[]>([]);
  protected readonly configured = signal(true);
  protected readonly pending = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected sync(): void {
    this.pending.set(true);
    this.message.set(null);
    this.error.set(null);
    this.api.syncMembers().subscribe({
      next: (r) => {
        this.pending.set(false);
        this.message.set(
          `${r.created} ajouté(s), ${r.updated} mis à jour, ${r.removed} retiré(s).`,
        );
        this.load();
      },
      error: (e: unknown) => {
        this.pending.set(false);
        this.error.set(apiErrorMessage(e, 'La synchronisation a échoué.'));
      },
    });
  }

  private load(): void {
    this.api.members().subscribe((r) => {
      this.members.set(r.items);
      this.configured.set(r.syncConfigured);
    });
  }
}

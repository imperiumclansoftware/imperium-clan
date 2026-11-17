import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminMember } from '../../core/api/models';
import { ClanRank, RANKS } from '../../core/ranks';
import { BranchPills } from '../../shared/branch-pills';
import { Sceau } from '../../shared/sceau';

@Component({
  selector: 'app-members-admin',
  imports: [DatePipe, BranchPills, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ligne entete">
      <div class="pile">
        <p class="libelle">Administration</p>
        <h1>Membres</h1>
        <p class="secondaire">
          Synchronisés depuis Conclave : seuls les membres qui l’ont accepté apparaissent sur le
          portail. Le grade du règlement s’attribue ici et n’est jamais modifié par la
          synchronisation.
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
            <th scope="col">Membre</th>
            <th scope="col">Grade</th>
            <th scope="col">Branches</th>
            <th scope="col">Dernière synchronisation</th>
          </tr>
        </thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr>
              <td>
                <span class="membre">
                  <app-sceau
                    [branches]="m.branches"
                    [size]="40"
                    [avatar]="m.avatarUrl"
                    [decorative]="true"
                  />
                  {{ m.pseudo }}
                </span>
              </td>
              <td>
                <label class="visually-hidden" [for]="'grade-' + m.id"
                  >Grade de {{ m.pseudo }}</label
                >
                <select
                  #grade
                  [id]="'grade-' + m.id"
                  [value]="m.rank"
                  [disabled]="saving() === m.id"
                  (change)="setRank(m, $any(grade.value), grade)"
                >
                  @for (r of ranks; track r.value) {
                    <option [value]="r.value" [selected]="r.value === m.rank">{{ r.label }}</option>
                  }
                </select>
              </td>
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
    .membre {
      display: inline-flex;
      align-items: center;
      gap: var(--imp-e-3);
      font-weight: 600;
    }
    select {
      min-height: 40px;
    }
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
  protected readonly saving = signal<string | null>(null);
  protected readonly ranks = RANKS;

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

  protected setRank(member: AdminMember, rank: ClanRank, select: HTMLSelectElement): void {
    this.saving.set(member.id);
    this.message.set(null);
    this.error.set(null);
    this.api.setMemberRank(member.id, rank).subscribe({
      next: (updated) => {
        this.saving.set(null);
        this.members.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        this.message.set(`${updated.pseudo} : grade enregistré.`);
      },
      error: (e: unknown) => {
        this.saving.set(null);
        select.value = member.rank; // grade refusé (ex. : déjà un Empereur) : on revient à l'ancien
        this.error.set(apiErrorMessage(e));
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

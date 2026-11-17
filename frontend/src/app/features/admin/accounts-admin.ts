import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminAccount } from '../../core/api/models';
import { AuthService } from '../../core/auth.service';

/**
 * Comptes du portail. Les membres se connectent avec Conclave : leurs droits en viennent à chaque
 * connexion (branche Communication → actualités). Seuls les administrateurs se désignent ici.
 */
@Component({
  selector: 'app-accounts-admin',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Comptes</h1>
      <p class="secondaire">
        Un compte est créé à la première connexion avec Conclave. Les droits suivent Conclave à
        chaque connexion : membre du clan → espace membre ; branche Communication → actualités pour
        toutes les branches. Les administrateurs se désignent ici.
      </p>
    </header>

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
            <th scope="col">Compte</th>
            <th scope="col">Connexion</th>
            <th scope="col">Droits</th>
            <th scope="col">Dernière connexion</th>
            <th scope="col">Administrateur</th>
          </tr>
        </thead>
        <tbody>
          @for (a of accounts(); track a.id) {
            <tr>
              <td>
                <span class="nom">{{ a.displayName }}</span>
                @if (a.email) {
                  <span class="secondaire courriel">{{ a.email }}</span>
                }
              </td>
              <td>{{ a.conclave ? 'Conclave' : 'Compte local' }}</td>
              <td>
                <span class="droits">
                  @if (a.admin) {
                    <span class="grade" data-grade="empereur">Administrateur</span>
                  }
                  @if (a.editor) {
                    <span class="grade" data-grade="officier">Actualités</span>
                  }
                  <span class="grade">Espace membre</span>
                </span>
              </td>
              <td>
                @if (a.lastLoginAt) {
                  <time [attr.datetime]="a.lastLoginAt">{{
                    a.lastLoginAt | date: 'd MMM y, HH:mm'
                  }}</time>
                } @else {
                  <span class="secondaire">—</span>
                }
              </td>
              <td>
                <label class="case">
                  <input
                    type="checkbox"
                    [checked]="a.admin"
                    [disabled]="saving() === a.id || a.id === me()"
                    (change)="setAdmin(a, $any($event.target))"
                  />
                  <span class="visually-hidden">Administrateur : {{ a.displayName }}</span>
                  @if (a.id === me()) {
                    <span class="secondaire">(toi)</span>
                  }
                </label>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="secondaire">Aucun compte.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .nom {
      display: block;
      font-weight: 600;
    }
    .courriel {
      font-size: var(--imp-taille-s);
    }
    .droits {
      display: flex;
      flex-wrap: wrap;
      gap: var(--imp-e-1);
    }
    .case {
      min-height: 44px;
    }
  `,
})
export class AccountsAdmin {
  private readonly api = inject(AdminApi);

  protected readonly accounts = signal<AdminAccount[]>([]);
  protected readonly saving = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly auth = inject(AuthService);
  /** Son propre compte : la case est verrouillée (on ne se retire pas le rôle soi-même) */
  protected readonly me = computed(() => this.auth.currentUser()?.id ?? null);

  constructor() {
    this.api.accounts().subscribe((items) => this.accounts.set(items));
  }

  protected setAdmin(account: AdminAccount, box: HTMLInputElement): void {
    this.saving.set(account.id);
    this.message.set(null);
    this.error.set(null);
    this.api.setAccountAdmin(account.id, box.checked).subscribe({
      next: (updated) => {
        this.saving.set(null);
        this.accounts.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.message.set(
          `${updated.displayName} ${updated.admin ? 'est administrateur' : 'n’est plus administrateur'}.`,
        );
      },
      error: (e: unknown) => {
        this.saving.set(null);
        box.checked = account.admin; // refusé (dernier administrateur…) : on revient à l'état réel
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}

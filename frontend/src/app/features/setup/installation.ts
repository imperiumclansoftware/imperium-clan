import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { apiErrorMessage } from '../../core/api/errors';
import { SetupApi } from '../../core/api/setup-api';
import { AuthService } from '../../core/auth.service';
import { backgroundUrl } from '../../core/backgrounds';
import { Sceau } from '../../shared/sceau';

export function samePassword(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirm')?.value as string | undefined;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

/**
 * Installation d'une instance neuve : création du premier administrateur. Le serveur n'accepte la
 * création que tant qu'aucun compte n'existe et sur présentation du jeton affiché dans ses logs.
 */
@Component({
  selector: 'app-installation',
  imports: [ReactiveFormsModule, RouterLink, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="installation">
      <img class="fond" [src]="fondClan" alt="" aria-hidden="true" />
      <div class="carte boite">
        <app-sceau [size]="88" [decorative]="true" />
        <div class="pile">
          <p class="libelle">Installation</p>
          <h1>Bienvenue dans l’Imperium</h1>
        </div>

        @switch (required()) {
          @case (undefined) {
            <p class="secondaire" role="status">Vérification de l’installation…</p>
          }
          @case (false) {
            <p>Ce site est déjà installé. Connecte-toi avec ton compte.</p>
            <a routerLink="/connexion" class="btn btn-principal">Se connecter</a>
          }
          @default {
            <p class="secondaire">
              Crée le premier compte administrateur. Il pourra ensuite gérer le contenu du site et
              créer les autres comptes.
            </p>
            <form [formGroup]="form" (ngSubmit)="submit()" class="pile">
              <div class="champ">
                <label for="s-token">Jeton d’installation</label>
                <input
                  id="s-token"
                  type="password"
                  formControlName="token"
                  autocomplete="off"
                  spellcheck="false"
                  required
                  aria-describedby="s-token-aide"
                />
                <p class="aide" id="s-token-aide">
                  Affiché dans les logs du conteneur au démarrage :
                  <code>docker logs &lt;conteneur&gt;</code> (ou la valeur de
                  <code>SETUP_TOKEN</code>).
                </p>
              </div>
              <div class="champ">
                <label for="s-name">Nom affiché</label>
                <input
                  id="s-name"
                  type="text"
                  formControlName="displayName"
                  maxlength="80"
                  autocomplete="nickname"
                  required
                />
              </div>
              <div class="champ">
                <label for="s-email">E-mail</label>
                <input
                  id="s-email"
                  type="email"
                  formControlName="email"
                  maxlength="180"
                  autocomplete="username"
                  required
                />
              </div>
              <div class="champ">
                <label for="s-password">Mot de passe</label>
                <input
                  id="s-password"
                  type="password"
                  formControlName="password"
                  autocomplete="new-password"
                  minlength="12"
                  required
                  aria-describedby="s-password-aide"
                />
                <p class="aide" id="s-password-aide">
                  12 caractères minimum. Une phrase de passe est idéale.
                </p>
              </div>
              <div class="champ">
                <label for="s-confirm">Confirmation du mot de passe</label>
                <input
                  id="s-confirm"
                  type="password"
                  formControlName="confirm"
                  autocomplete="new-password"
                  required
                  [attr.aria-invalid]="form.hasError('mismatch')"
                />
                @if (form.hasError('mismatch') && form.controls.confirm.dirty) {
                  <p class="erreur">Les deux mots de passe sont différents.</p>
                }
              </div>
              @if (error()) {
                <p class="erreur" role="alert">{{ error() }}</p>
              }
              <button
                type="submit"
                class="btn btn-principal"
                [disabled]="form.invalid || pending()"
              >
                Créer l’administrateur
              </button>
            </form>
          }
        }
      </div>
    </main>
  `,
  styles: `
    .fond {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: -1;
      filter: brightness(0.6);
    }
    .installation {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: var(--imp-e-4);
    }
    .boite {
      width: min(480px, 100%);
      gap: var(--imp-e-5);
      border-radius: var(--imp-rayon-xl);
      padding: var(--imp-e-6);
    }
    .boite > .btn {
      justify-self: start;
    }
    code {
      font-size: 0.95em;
      overflow-wrap: anywhere;
    }
  `,
})
export class Installation {
  private readonly setup = inject(SetupApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly fondClan = backgroundUrl('clan');
  protected readonly required = toSignal(this.setup.required());
  protected readonly error = signal<string | null>(null);
  protected readonly pending = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      token: ['', [Validators.required, Validators.maxLength(200)]],
      displayName: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
      password: ['', [Validators.required, Validators.minLength(12)]],
      confirm: ['', Validators.required],
    },
    { validators: samePassword },
  );

  protected submit(): void {
    const { token, displayName, email, password } = this.form.getRawValue();
    this.pending.set(true);
    this.error.set(null);
    this.setup
      .install({ token: token.trim(), displayName, email, password })
      .pipe(switchMap(() => this.auth.refresh()))
      .subscribe({
        next: () => void this.router.navigateByUrl('/admin', { replaceUrl: true }),
        error: (e: unknown) => {
          this.pending.set(false);
          this.error.set(apiErrorMessage(e));
        },
      });
  }
}

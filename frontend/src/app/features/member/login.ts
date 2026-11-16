import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SetupApi } from '../../core/api/setup-api';
import { safeReturnUrl } from '../../core/auth.guard';
import { AuthService } from '../../core/auth.service';
import { backgroundUrl } from '../../core/backgrounds';
import { Sceau } from '../../shared/sceau';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="connexion">
      <img class="fond" [src]="fondClan" alt="" aria-hidden="true" />
      <div class="carte boite">
        <app-sceau [size]="88" [decorative]="true" />
        <div class="pile">
          <p class="libelle">Espace membre</p>
          <h1>Imperium</h1>
        </div>
        <p class="alerte secondaire">
          La connexion avec ton compte Conclave arrive bientôt. En attendant, utilise le compte que
          t’a remis un administrateur du clan.
        </p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="pile">
          <div class="champ">
            <label for="email">E-mail</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              required
            />
          </div>
          <div class="champ">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              required
            />
          </div>
          @if (error()) {
            <!-- Message générique : ne révèle pas si le compte existe -->
            <p class="erreur" role="alert">Identifiants invalides.</p>
          }
          <button type="submit" class="btn btn-principal" [disabled]="form.invalid || pending()">
            Se connecter
          </button>
        </form>
        <a routerLink="/" class="secondaire retour">← Retour au site</a>
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
    .connexion {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: var(--imp-e-4);
    }
    .boite {
      width: min(440px, 100%);
      gap: var(--imp-e-5);
      border-radius: var(--imp-rayon-xl);
      padding: var(--imp-e-6);
    }
    .retour {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
    }
  `,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly setup = inject(SetupApi);

  /** ?retour=/ressources : page demandée avant la connexion (chemin interne uniquement). */
  readonly retour = input<string>();

  protected readonly fondClan = backgroundUrl('clan');
  protected readonly error = signal(false);
  protected readonly pending = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // Instance neuve (aucun compte) : on part créer le premier administrateur.
    this.setup.required().subscribe((required) => {
      if (required) {
        void this.router.navigateByUrl('/installation', { replaceUrl: true });
      }
    });
  }

  protected submit(): void {
    const { email, password } = this.form.getRawValue();
    this.pending.set(true);
    this.auth.login(email, password).subscribe({
      next: () => {
        const target =
          safeReturnUrl(this.retour()) ?? (this.auth.isEditor() ? '/admin' : '/ressources');
        void this.router.navigateByUrl(target);
      },
      error: () => {
        this.error.set(true);
        this.pending.set(false);
        this.form.controls.password.reset();
      },
    });
  }
}

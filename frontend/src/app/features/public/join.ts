import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/errors';
import { PublicApi } from '../../core/api/public-api';
import { BRANCH_CODES, BranchCode } from '../../core/branches';
import { BranchPicker } from '../../shared/branch-picker';
import { Sceau } from '../../shared/sceau';

@Component({
  selector: 'app-join',
  imports: [ReactiveFormsModule, RouterLink, BranchPicker, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conteneur etroit">
      <header class="page-entete">
        <p class="libelle">Rejoindre le clan</p>
        <h1>Rejoins l’Imperium</h1>
        <p class="secondaire">
          Présente-toi en quelques lignes : un membre du clan te répondra par e-mail. Tu peux
          choisir plusieurs branches.
        </p>
      </header>

      @if (sent()) {
        <div class="carte merci" role="status">
          <app-sceau [branches]="chosen()" [size]="96" [decorative]="true" />
          <h2 class="gothique">Merci !</h2>
          <p>Ta candidature est bien arrivée. On revient vers toi très vite.</p>
          <a routerLink="/" class="btn btn-secondaire">Retour à l’accueil</a>
        </div>
      } @else {
        <form class="carte formulaire" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="champ">
            <label for="pseudo">Pseudo</label>
            <input
              id="pseudo"
              type="text"
              formControlName="pseudo"
              autocomplete="nickname"
              maxlength="40"
              required
              [attr.aria-invalid]="invalid('pseudo')"
            />
          </div>
          <div class="champ">
            <label for="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              maxlength="180"
              required
              [attr.aria-invalid]="invalid('email')"
              aria-describedby="email-aide"
            />
            <p class="aide" id="email-aide">
              Uniquement pour te répondre. Jamais affichée publiquement.
            </p>
          </div>
          <div class="champ">
            <label for="discord">Pseudo Discord <span class="secondaire">(facultatif)</span></label>
            <input
              id="discord"
              type="text"
              formControlName="discord"
              maxlength="40"
              autocomplete="off"
            />
          </div>
          <app-branch-picker formControlName="branches" legend="Branches qui t’intéressent" />
          <div class="champ">
            <label for="message">Présente-toi</label>
            <textarea
              id="message"
              formControlName="message"
              maxlength="3000"
              required
              [attr.aria-invalid]="invalid('message')"
              aria-describedby="message-aide"
            ></textarea>
            <p class="aide" id="message-aide">
              Tes jeux, tes passions, ce que tu aimerais faire au sein du clan (20 caractères
              minimum).
            </p>
          </div>

          <!-- Pot de miel anti-robot : invisible pour les humains, ignoré des lecteurs d'écran -->
          <div class="pot" aria-hidden="true">
            <label for="website">Site web</label>
            <input
              id="website"
              type="text"
              formControlName="website"
              tabindex="-1"
              autocomplete="off"
            />
          </div>

          <label class="case consentement">
            <input type="checkbox" formControlName="consent" required />
            <span
              >J’accepte que ces informations soient utilisées pour traiter ma candidature. Elles
              sont supprimées au bout de 6 mois.</span
            >
          </label>

          @if (error()) {
            <p class="erreur" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-principal" [disabled]="pending()">
            Envoyer ma candidature
          </button>
        </form>
      }
    </div>
  `,
  styles: `
    .etroit {
      max-width: 760px;
    }
    .formulaire {
      gap: var(--imp-e-5);
    }
    .formulaire .btn {
      justify-self: start;
    }
    .consentement {
      align-items: flex-start;
    }
    .consentement input {
      margin-top: 2px;
    }
    .pot {
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }
    .merci {
      justify-items: start;
      gap: var(--imp-e-4);
    }
  `,
})
export class Join implements OnInit {
  /** ?branches=ICG,ICS : branches précochées (lien « Rejoindre la branche »). */
  readonly branches = input<string>();

  private readonly api = inject(PublicApi);

  protected readonly sent = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly chosen = signal<BranchCode[]>([]);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    pseudo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    discord: [''],
    branches: [[] as BranchCode[]],
    message: ['', [Validators.required, Validators.minLength(20)]],
    consent: [false, Validators.requiredTrue],
    website: [''],
  });

  ngOnInit(): void {
    const wanted = (this.branches() ?? '').split(',');
    const preset = BRANCH_CODES.filter((c) => wanted.includes(c));
    if (preset.length) {
      this.form.controls.branches.setValue(preset);
    }
  }

  protected invalid(name: 'pseudo' | 'email' | 'message'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.invalid || value.branches.length === 0) {
      this.error.set(
        value.branches.length === 0
          ? 'Choisis au moins une branche.'
          : 'Vérifie les champs : pseudo, e-mail valide, présentation d’au moins 20 caractères et consentement.',
      );
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.api.join({ ...value, discord: value.discord.trim() || null }).subscribe({
      next: () => {
        this.chosen.set(value.branches);
        this.sent.set(true);
      },
      error: (e: unknown) => {
        this.error.set(apiErrorMessage(e));
        this.pending.set(false);
      },
    });
  }
}

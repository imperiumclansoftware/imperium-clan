import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { BranchProfile, RichDoc } from '../../core/api/models';
import { PublicApi } from '../../core/api/public-api';
import { BranchTheme } from '../../core/branch-theme';
import { BranchCode, branchInfo } from '../../core/branches';
import { RichEditor } from '../../shared/rich-editor';
import { Sceau } from '../../shared/sceau';

@Component({
  selector: 'app-branches-admin',
  imports: [FormsModule, RouterLink, RichEditor, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Branches</h1>
      <p class="secondaire">
        Présentation affichée dans la zone de chaque branche : accroche courte, puis texte mis en
        forme (intertitres, listes, liens, images).
      </p>
    </header>

    <div class="pile liste">
      @for (p of profiles(); track p.code) {
        <form
          class="carte branche"
          [style.--couleur]="color(p.code)"
          (focusin)="theme.set(p.code)"
          (submit)="$event.preventDefault(); save(p, intro.value)"
        >
          <div class="ligne">
            <app-sceau [branches]="[p.code]" [size]="48" [decorative]="true" />
            <div>
              <p class="sigle">{{ p.code }}</p>
              <h2>{{ p.name }}</h2>
            </div>
            <a [routerLink]="['/branches', p.code.toLowerCase()]" class="voir">Voir la zone</a>
          </div>
          <div class="champ">
            <label [for]="'i-' + p.code">Accroche</label>
            <input
              #intro
              [id]="'i-' + p.code"
              type="text"
              [value]="p.intro"
              maxlength="300"
              required
            />
          </div>
          <div class="champ">
            <span class="etiquette">Présentation</span>
            <app-rich-editor
              [ngModel]="p.content"
              (ngModelChange)="drafts.set(p.code, $event)"
              [ngModelOptions]="{ standalone: true }"
              [label]="'Présentation de la branche ' + p.name"
              placeholder="Ce que fait la branche, comment la rejoindre…"
            />
          </div>
          <div class="ligne">
            <button type="submit" class="btn btn-principal btn-petit">Enregistrer</button>
            @if (saved() === p.code) {
              <span class="succes" role="status">Enregistré.</span>
            }
            @if (error()?.code === p.code) {
              <span class="erreur" role="alert">{{ error()?.message }}</span>
            }
          </div>
        </form>
      }
    </div>
  `,
  styles: `
    .etiquette {
      font-weight: 600;
      font-size: var(--imp-taille-s);
    }
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .liste {
      gap: var(--imp-e-4);
    }
    .branche {
      gap: var(--imp-e-4);
      border-left: 1px solid var(--imp-trait);
      transition: border-color 0.3s;
    }
    .branche:focus-within {
      border-color: var(--couleur);
    }
    .sigle {
      color: var(--couleur);
      font-size: var(--imp-taille-xs);
      font-weight: 700;
      letter-spacing: 0.16em;
    }
    h2 {
      font-size: var(--imp-taille-l);
    }
    .voir {
      margin-left: auto;
      color: var(--imp-gris-sombre);
      display: inline-flex;
      min-height: 44px;
      align-items: center;
    }
    .branche .btn {
      justify-self: start;
    }
  `,
})
export class BranchesAdmin implements OnDestroy {
  private readonly admin = inject(AdminApi);
  /** L'interface prend la couleur de la branche en cours d'édition. */
  protected readonly theme = inject(BranchTheme);

  protected readonly profiles = signal<BranchProfile[]>([]);
  protected readonly saved = signal<BranchCode | null>(null);
  protected readonly error = signal<{ code: BranchCode; message: string } | null>(null);
  /** Présentation modifiée dans l'éditeur, par branche, en attendant l'enregistrement */
  protected readonly drafts = new Map<BranchCode, RichDoc>();

  constructor() {
    inject(PublicApi)
      .branches()
      .subscribe((items) => this.profiles.set(items));
  }

  ngOnDestroy(): void {
    this.theme.set(null);
  }

  protected color(code: BranchCode): string {
    return branchInfo(code).color;
  }

  protected save(p: BranchProfile, intro: string): void {
    this.error.set(null);
    const content = this.drafts.get(p.code) ?? p.content;
    this.admin.updateBranch(p.code, { intro, content }).subscribe({
      next: (updated) => {
        this.drafts.delete(updated.code);
        this.profiles.update((list) => list.map((x) => (x.code === updated.code ? updated : x)));
        this.saved.set(updated.code);
      },
      error: (e: unknown) => this.error.set({ code: p.code, message: apiErrorMessage(e) }),
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../core/api/admin-api';
import { apiErrorMessage } from '../../core/api/errors';
import { AdminTool } from '../../core/api/models';
import { BranchCode } from '../../core/branches';
import { BranchPicker } from '../../shared/branch-picker';
import { BranchPills } from '../../shared/branch-pills';

@Component({
  selector: 'app-tools-admin',
  imports: [ReactiveFormsModule, BranchPicker, BranchPills],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Administration</p>
      <h1>Outils du clan</h1>
    </header>

    <div class="disposition">
      <section class="pile" aria-labelledby="liste-titre">
        <h2 id="liste-titre">Outils</h2>
        @for (tool of tools(); track tool.id) {
          <article class="carte">
            <div class="ligne entre">
              <h3>
                {{ tool.name }}
                @if (!tool.published) {
                  <span class="libelle">· masqué</span>
                }
              </h3>
              <app-branch-pills [branches]="tool.branches" />
            </div>
            <p class="code secondaire">{{ tool.url }}</p>
            <div class="ligne">
              <button type="button" class="btn btn-secondaire btn-petit" (click)="edit(tool)">
                Modifier
              </button>
              <button type="button" class="btn btn-danger btn-petit" (click)="remove(tool)">
                Supprimer
              </button>
            </div>
          </article>
        } @empty {
          <p class="secondaire">Aucun outil.</p>
        }
      </section>

      <form class="carte formulaire" [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editing() ? 'Modifier l’outil' : 'Nouvel outil' }}</h2>
        <div class="champ">
          <label for="t-name">Nom</label
          ><input id="t-name" type="text" formControlName="name" maxlength="60" required />
        </div>
        <div class="champ">
          <label for="t-url">Adresse (https)</label
          ><input id="t-url" type="url" formControlName="url" required placeholder="https://" />
        </div>
        <div class="champ">
          <label for="t-desc">Description</label
          ><textarea id="t-desc" formControlName="description" maxlength="1000"></textarea>
        </div>
        <app-branch-picker formControlName="branches" legend="Branches concernées" />
        <div class="champ">
          <label for="t-pos">Ordre d’affichage</label
          ><input id="t-pos" type="number" formControlName="position" min="0" max="1000" />
        </div>
        <label class="case"
          ><input type="checkbox" formControlName="published" /> Visible sur le site</label
        >
        @if (error()) {
          <p class="erreur" role="alert">{{ error() }}</p>
        }
        <div class="ligne">
          <button type="submit" class="btn btn-principal" [disabled]="form.invalid">
            Enregistrer
          </button>
          @if (editing()) {
            <button type="button" class="btn btn-secondaire" (click)="reset()">Annuler</button>
          }
        </div>
      </form>
    </div>
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
    .disposition {
      display: grid;
      gap: var(--imp-e-5);
      align-items: start;
    }
    @media (min-width: 1100px) {
      .disposition {
        grid-template-columns: 1fr 420px;
      }
    }
    .entre {
      justify-content: space-between;
    }
    .formulaire {
      gap: var(--imp-e-4);
    }
  `,
})
export class ToolsAdmin {
  private readonly api = inject(AdminApi);

  protected readonly tools = signal<AdminTool[]>([]);
  protected readonly editing = signal<AdminTool | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    url: ['', [Validators.required, Validators.pattern(/^https:\/\//)]],
    description: [''],
    branches: [[] as BranchCode[]],
    position: [0],
    published: [true],
  });

  constructor() {
    this.load();
  }

  protected edit(tool: AdminTool): void {
    this.editing.set(tool);
    this.error.set(null);
    this.form.setValue({
      name: tool.name,
      url: tool.url,
      description: tool.description,
      branches: [...tool.branches],
      position: tool.position,
      published: tool.published,
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.error.set(null);
    this.form.reset();
  }

  protected save(): void {
    const input = this.form.getRawValue();
    const current = this.editing();
    const request = current ? this.api.updateTool(current.id, input) : this.api.createTool(input);
    request.subscribe({
      next: () => {
        this.reset();
        this.load();
      },
      error: (e: unknown) => this.error.set(apiErrorMessage(e)),
    });
  }

  protected remove(tool: AdminTool): void {
    if (confirm(`Supprimer l’outil « ${tool.name} » ?`)) {
      this.api.deleteTool(tool.id).subscribe(() => this.load());
    }
  }

  private load(): void {
    this.api.tools().subscribe((tools) => this.tools.set(tools));
  }
}

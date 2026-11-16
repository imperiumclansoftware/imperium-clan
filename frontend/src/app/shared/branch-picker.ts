import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BRANCHES, BranchCode } from '../core/branches';

/**
 * Choix des branches par cases à cocher. Règle de la charte : JAMAIS de choix unique,
 * un membre (ou un outil, une actualité) peut relever de plusieurs branches.
 */
@Component({
  selector: 'app-branch-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BranchPicker), multi: true },
  ],
  template: `
    <fieldset class="champ">
      <legend>{{ legend() }}</legend>
      <div class="cases">
        @for (b of branches; track b.code) {
          <label class="case">
            <input
              type="checkbox"
              [checked]="value().includes(b.code)"
              [disabled]="disabled()"
              (change)="toggle(b.code)"
              (blur)="onTouched()"
            />
            <span class="pastille" [style.--pastille]="b.color">{{ b.code }}</span>
            <span>{{ b.short }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .cases {
      display: flex;
      flex-wrap: wrap;
      gap: var(--imp-e-2) var(--imp-e-5);
    }
  `,
})
export class BranchPicker implements ControlValueAccessor {
  readonly legend = input('Branches');

  protected readonly branches = BRANCHES;
  protected readonly value = signal<BranchCode[]>([]);
  protected readonly disabled = signal(false);

  private onChange: (value: BranchCode[]) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: BranchCode[] | null): void {
    this.value.set(value ?? []);
  }

  registerOnChange(fn: (value: BranchCode[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected toggle(code: BranchCode): void {
    const set = new Set(this.value());
    if (set.has(code)) {
      set.delete(code);
    } else {
      set.add(code);
    }
    const next = BRANCHES.map((b) => b.code).filter((c) => set.has(c));
    this.value.set(next);
    this.onChange(next);
  }
}

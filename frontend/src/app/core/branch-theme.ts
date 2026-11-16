import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { BranchCode } from './branches';

/**
 * Couleur de l'interface selon la branche : pose `data-branche` sur <html>, les feuilles de style
 * en déduisent `--accent` (transition animée, cf. styles.scss). null = interface neutre.
 */
@Injectable({ providedIn: 'root' })
export class BranchTheme {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly branch = signal<BranchCode | null>(null);

  readonly current = this.branch.asReadonly();

  constructor() {
    effect(() => {
      const code = this.branch();
      if (code) {
        this.root.dataset['branche'] = code;
      } else {
        delete this.root.dataset['branche'];
      }
    });
  }

  set(code: BranchCode | null): void {
    this.branch.set(code);
  }
}

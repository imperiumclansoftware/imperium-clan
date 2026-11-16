import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { samePassword } from './installation';

const group = (password: string, confirm: string): FormGroup =>
  new FormGroup({ password: new FormControl(password), confirm: new FormControl(confirm) });

describe('samePassword', () => {
  it('accepte deux mots de passe identiques', () => {
    expect(samePassword(group('Phrase-de-passe-2026', 'Phrase-de-passe-2026'))).toBeNull();
  });

  it('signale une confirmation différente', () => {
    expect(samePassword(group('Phrase-de-passe-2026', 'Phrase-de-passe-2027'))).toEqual({
      mismatch: true,
    });
  });

  it('ne signale rien tant que la confirmation est vide', () => {
    expect(samePassword(group('Phrase-de-passe-2026', ''))).toBeNull();
  });
});

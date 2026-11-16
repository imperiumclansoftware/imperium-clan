import { TestBed } from '@angular/core/testing';
import { BranchTheme } from './branch-theme';

describe('BranchTheme', () => {
  it('pose puis retire la branche sur <html>', () => {
    const theme = TestBed.inject(BranchTheme);

    theme.set('ICF');
    TestBed.tick();
    expect(document.documentElement.dataset['branche']).toBe('ICF');

    theme.set(null);
    TestBed.tick();
    expect(document.documentElement.dataset['branche']).toBeUndefined();
  });
});

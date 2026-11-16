import { safeReturnUrl } from './auth.guard';

describe('safeReturnUrl', () => {
  it('accepte un chemin interne', () => {
    expect(safeReturnUrl('/ressources/banniere?format=x')).toBe('/ressources/banniere?format=x');
  });

  it('refuse les redirections vers un autre site', () => {
    expect(safeReturnUrl('https://evil.example')).toBeNull();
    expect(safeReturnUrl('//evil.example')).toBeNull();
    expect(safeReturnUrl('/\\evil.example')).toBeNull();
    expect(safeReturnUrl(null)).toBeNull();
  });
});

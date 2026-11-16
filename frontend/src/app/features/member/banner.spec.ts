import { BANNER_FORMATS, bannerFileName, coverRect, fitFontSize } from './banner';

describe('générateur de bannière', () => {
  const facebook = BANNER_FORMATS[0];

  it('propose le format couverture Facebook en 1640 × 624', () => {
    expect(facebook).toMatchObject({ id: 'facebook', width: 1640, height: 624 });
  });

  it('réduit la police d’un pseudo trop long jusqu’à ce qu’il tienne', () => {
    const measure = (size: number): number => size * 10; // 10 caractères
    expect(fitFontSize(measure, 100, 40, 2000)).toBe(100);
    expect(fitFontSize(measure, 100, 40, 700)).toBe(70);
    expect(fitFontSize(measure, 100, 40, 100)).toBe(40);
  });

  it('produit un nom de fichier sûr, sans accents ni caractères spéciaux', () => {
    expect(bannerFileName(facebook, 'Élise « la Brave » ⚔')).toBe(
      'imperium-facebook-elise-la-brave.png',
    );
    expect(bannerFileName(facebook, '../../etc/passwd')).toBe('imperium-facebook-etc-passwd.png');
    expect(bannerFileName(facebook, '   ')).toBe('imperium-facebook.png');
  });

  it('recadre le fond en « cover » centré, sans déformation', () => {
    // Image Gemini 1584 × 672 sur la couverture Facebook 1640 × 624 : agrandie de ~3,5 %, centrée.
    const r = coverRect(1584, 672, 1640, 624);
    expect(r.w).toBeCloseTo(1640);
    expect(r.h / r.w).toBeCloseTo(672 / 1584);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeLessThan(0);
    // Bannière X 1500 × 500 (plus allongée) : la largeur commande, le haut et le bas sont rognés.
    const x = coverRect(1584, 672, 1500, 500);
    expect(x.w).toBeGreaterThanOrEqual(1500);
    expect(x.h).toBeGreaterThanOrEqual(500);
  });
});

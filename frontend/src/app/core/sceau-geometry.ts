/** Géométrie du sceau (repère 200×200), partagée par le composant SVG et le générateur de bannières. */

/** « I » gothique, tracé extrait de UnifrakturCook Bold (OFL) — copie de imperium_design/web/sceau.js. */
export const I_GOTHIQUE =
  'M132.72 53.00Q126.65 63.72 124.56 67.64Q126.00 84.03 127.24 94.74Q128.48 105.45 128.48 109.24Q128.48 120.28 124.23 126.49Q118.16 130.73 111.92 136.94Q105.68 143.14 99.35 150.00Q87.92 144.64 72.76 137.39Q67.28 135.17 67.28 129.49Q67.28 127.99 67.83 124.82Q68.39 121.65 69.20 117.05Q70.02 112.44 70.80 107.81Q77.92 117.15 86.02 122.66Q94.12 128.18 102.74 131.52Q103.92 131.97 105.65 131.97Q107.38 131.97 109.31 129.69Q111.23 127.40 111.23 123.58Q111.23 119.76 110.61 114.01Q109.99 108.26 108.49 99.38Q106.99 90.50 105.68 81.48Q110.84 77.37 116.53 71.23Q112.08 71.69 105.72 71.69Q99.35 71.69 93.04 70.41Q86.74 69.14 82.95 69.14Q75.44 69.14 69.76 72.60Q72.89 60.52 79.16 50.00Q98.30 53.14 122.53 53.14Q127.50 53.14 132.72 53.00Z';

export const DIAMONDS: readonly (readonly [number, number])[] = [
  [100, 16],
  [184, 100],
  [100, 184],
  [16, 100],
];

/** Couleurs du sceau selon le fond (web/sceau.js). */
export const SCEAU_PALETTE = {
  sombre: { ink: '#F4F1EC', off: '#2A2A31', ring: '#3A3A42' },
  clair: { ink: '#111114', off: '#DDD9D2', ring: '#CFCAC1' },
} as const;

/** Les quatre branches du clan (charte imperium_design). Ordre officiel : ICG, ICF, ICC, ICS. */
export type BranchCode = 'ICG' | 'ICF' | 'ICC' | 'ICS';

export interface BranchInfo {
  readonly code: BranchCode;
  readonly name: string;
  readonly short: string;
  /** Couleur principale (fond sombre). Jamais seule : toujours accompagnée du sigle. */
  readonly color: string;
  /** Même couleur en hexadécimal, pour les attributs SVG (var() n'y est pas interprété). */
  readonly hex: string;
  readonly tagline: string;
  /** Arc du sceau, repère 200×200 (web/sceau.js). */
  readonly arc: string;
}

export const BRANCHES: readonly BranchInfo[] = [
  {
    code: 'ICG',
    name: 'Imperium Clan Gaming',
    short: 'Gaming',
    color: 'var(--imp-icg)',
    hex: '#FF4655',
    tagline: 'Jouer ensemble, en compétition comme pour le plaisir.',
    arc: 'M17.27 85.42 A84 84 0 0 1 85.42 17.27',
  },
  {
    code: 'ICF',
    name: 'Imperium Clan FanDom',
    short: 'FanDom',
    color: 'var(--imp-icf)',
    hex: '#F5B82E',
    tagline: 'Regarder, partager et débattre : films, séries, univers.',
    arc: 'M114.58 17.27 A84 84 0 0 1 182.73 85.42',
  },
  {
    code: 'ICC',
    name: 'Imperium Clan Communication',
    short: 'Communication',
    color: 'var(--imp-icc)',
    hex: '#A47BFF',
    tagline: 'Raconter le clan : news, visuels et réseaux.',
    arc: 'M85.42 182.73 A84 84 0 0 1 17.27 114.58',
  },
  {
    code: 'ICS',
    name: 'Imperium Clan Software',
    short: 'Software',
    color: 'var(--imp-ics)',
    hex: '#2BD99F',
    tagline: 'Coder les outils du clan, en open source.',
    arc: 'M182.73 114.58 A84 84 0 0 1 114.58 182.73',
  },
];

export const BRANCH_CODES: readonly BranchCode[] = BRANCHES.map((b) => b.code);

export function branchInfo(code: BranchCode): BranchInfo {
  const info = BRANCHES.find((b) => b.code === code);
  if (!info) {
    throw new Error(`Branche inconnue : ${code}`);
  }
  return info;
}

/** Grades du règlement du clan, du plus haut au plus bas (miroir de App\Enum\ClanRank). */
export type ClanRank = 'empereur' | 'officier' | 'parrain' | 'membre';

export const RANKS: readonly { readonly value: ClanRank; readonly label: string }[] = [
  { value: 'empereur', label: 'Empereur' },
  { value: 'officier', label: 'Officier' },
  { value: 'parrain', label: 'Parrain' },
  { value: 'membre', label: 'Membre' },
];

export function rankLabel(rank: ClanRank | null | undefined): string {
  return RANKS.find((r) => r.value === rank)?.label ?? 'Membre';
}

import { BranchCode } from './branches';

/** Fonds générés pour le clan (images Gemini, voir README). `clan` = les quatre couleurs. */
export type BackgroundKey = BranchCode | 'clan';

/** Chemins RELATIFS (base href) : fonctionnent sous / comme sous /absproxy/4210/. */
export function backgroundUrl(key: BackgroundKey, size: 'full' | 'small' = 'full'): string {
  return `brand/fonds/fond-${key.toLowerCase()}${size === 'small' ? '-640' : ''}.webp`;
}

import { BRANCHES, BranchCode } from '../../core/branches';
import { DIAMONDS, I_GOTHIQUE, SCEAU_PALETTE } from '../../core/sceau-geometry';

/**
 * Générateur de bannières pour les réseaux sociaux, dessinées dans un canvas (aucun envoi au serveur).
 * Composition (charte imperium_design, « Aperçu social ») : sceau du membre (ses arcs allumés),
 * « Imperium » en gothique, pseudo en Inter, pastilles des branches, bandeau 4 couleurs.
 */

export interface BannerFormat {
  readonly id: string;
  readonly label: string;
  /** Titre court (cartes de la page Ressources). */
  readonly short: string;
  readonly hint: string;
  readonly width: number;
  readonly height: number;
}

/** Ajouter un format = ajouter une ligne : la mise en page s'adapte aux proportions. */
export const BANNER_FORMATS: readonly BannerFormat[] = [
  {
    id: 'facebook',
    short: 'Bannière Facebook',
    label: 'Facebook — photo de couverture',
    hint: '1640 × 624 px',
    width: 1640,
    height: 624,
  },
  {
    id: 'x',
    short: 'Bannière X (Twitter)',
    label: 'X (Twitter) — bannière de profil',
    hint: '1500 × 500 px',
    width: 1500,
    height: 500,
  },
];

export interface BannerOptions {
  readonly pseudo: string;
  readonly branches: readonly BranchCode[];
  readonly format: BannerFormat;
  /** Image de fond (fonds du clan), recadrée en « cover » sous un voile sombre. null = fond uni. */
  readonly background?:
    (CanvasImageSource & { readonly width: number; readonly height: number }) | null;
}

const COLORS = {
  background: '#0E0E10',
  ivory: '#F4F1EC',
  grey: '#A8A49C',
  border: '#3A3A42',
};
const FONT_TITLE = '"UnifrakturCook", "Old English Text MT", serif';
const FONT_TEXT = '"Inter", system-ui, sans-serif';

/** Charge les polices de la charte avant de dessiner (sinon le canvas utilise une police de secours). */
export async function loadBannerFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`700 64px ${FONT_TITLE}`),
    document.fonts.load(`700 64px ${FONT_TEXT}`),
    document.fonts.load(`600 24px ${FONT_TEXT}`),
  ]);
}

export function drawBanner(ctx: CanvasRenderingContext2D, options: BannerOptions): void {
  const { width: W, height: H } = options.format;
  const pseudo = options.pseudo.trim() || 'Ton pseudo';
  const branches = BRANCHES.filter((b) => options.branches.includes(b.code));

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
  if (options.background) {
    drawCover(ctx, options.background, W, H);
    // Voile : le texte reste lisible quelle que soit l'image (contraste ≥ 4,5:1 visé sur l'ivoire).
    ctx.fillStyle = 'rgba(14, 14, 16, 0.35)';
    ctx.fillRect(0, 0, W, H);
  }

  // Bandeau signature (6 px pour 500 px de haut)
  const band = Math.max(6, Math.round(H * 0.012));
  BRANCHES.forEach((b, i) => {
    ctx.fillStyle = b.hex;
    ctx.fillRect(Math.round((W * i) / 4), H - band, Math.ceil(W / 4), band);
  });

  // Mesures du bloc texte
  const titleSize = Math.round(H * 0.1);
  const pillHeight = Math.round(H * 0.07);
  const pillFont = Math.round(H * 0.032);
  const maxTextWidth = W * 0.46;
  const pseudoSize = fitFontSize(
    (size) => measure(ctx, `700 ${size}px ${FONT_TEXT}`, pseudo),
    Math.round(H * 0.17),
    Math.round(H * 0.07),
    maxTextWidth,
  );
  ctx.font = `700 ${titleSize}px ${FONT_TITLE}`;
  const titleWidth = ctx.measureText('Imperium').width;
  const pseudoWidth = measure(ctx, `700 ${pseudoSize}px ${FONT_TEXT}`, pseudo);
  const pills = layoutPills(ctx, branches, pillFont, pillHeight);
  const textWidth = Math.max(titleWidth, pseudoWidth, pills.width);

  const gapTitle = H * 0.03;
  const gapPills = H * 0.06;
  const textHeight =
    titleSize + gapTitle + pseudoSize + (pills.items.length ? gapPills + pillHeight : 0);

  // Composition centrée : sceau à gauche, texte à droite (zone sûre pour les recadrages mobiles)
  const seal = Math.round(H * 0.58);
  const gap = Math.round(H * 0.09);
  const total = seal + gap + textWidth;
  const left = Math.round((W - total) / 2);
  const centerY = (H - band) / 2;

  drawSeal(ctx, left, centerY - seal / 2, seal, options.branches);

  const textX = left + seal + gap;
  let y = centerY - textHeight / 2;
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.ivory;
  ctx.font = `700 ${titleSize}px ${FONT_TITLE}`;
  ctx.fillText('Imperium', textX, y - titleSize * 0.08);
  y += titleSize + gapTitle;
  ctx.font = `700 ${pseudoSize}px ${FONT_TEXT}`;
  ctx.fillText(pseudo, textX, y);
  y += pseudoSize + gapPills;
  drawPills(ctx, pills, textX, y, pillFont, pillHeight);
  ctx.restore();
}

/** Charge une image (même origine : le canvas reste exportable en PNG). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image introuvable : ${src}`));
    image.src = src;
  });
}

/** Recadrage « cover » centré : l'image remplit tout le format sans être déformée. */
export function coverRect(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale;
  const h = imageHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { readonly width: number; readonly height: number },
  width: number,
  height: number,
): void {
  const r = coverRect(image.width, image.height, width, height);
  ctx.drawImage(image, r.x, r.y, r.w, r.h);
}

/** Plus grande taille de police (entre max et min) qui tient dans la largeur donnée. */
export function fitFontSize(
  measureAt: (size: number) => number,
  max: number,
  min: number,
  maxWidth: number,
): number {
  for (let size = max; size > min; size -= 2) {
    if (measureAt(size) <= maxWidth) {
      return size;
    }
  }
  return min;
}

/** Nom de fichier lisible et sûr : imperium-facebook-mon-pseudo.png */
export function bannerFileName(format: BannerFormat, pseudo: string): string {
  const slug = pseudo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `imperium-${format.id}${slug ? '-' + slug : ''}.png`;
}

function measure(ctx: CanvasRenderingContext2D, font: string, text: string): number {
  ctx.font = font;
  return ctx.measureText(text).width;
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  active: readonly BranchCode[],
): void {
  const palette = SCEAU_PALETTE.sombre;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 200, size / 200);

  ctx.beginPath();
  ctx.arc(100, 100, 66, 0, Math.PI * 2);
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.lineWidth = 14;
  ctx.lineCap = 'butt';
  for (const b of BRANCHES) {
    ctx.strokeStyle = active.includes(b.code) ? b.hex : palette.off;
    ctx.stroke(new Path2D(b.arc));
  }

  ctx.fillStyle = palette.ink;
  for (const [dx, dy] of DIAMONDS) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  ctx.translate(-4, 0);
  ctx.fill(new Path2D(I_GOTHIQUE));
  ctx.restore();
}

interface PillLayout {
  readonly items: { readonly label: string; readonly color: string; readonly width: number }[];
  readonly width: number;
}

function layoutPills(
  ctx: CanvasRenderingContext2D,
  branches: typeof BRANCHES,
  font: number,
  height: number,
): PillLayout {
  const padding = height * 0.42;
  const dot = height * 0.16;
  const gap = height * 0.25;
  ctx.font = `700 ${font}px ${FONT_TEXT}`;
  setLetterSpacing(ctx, `${font * 0.08}px`);
  const items = branches.map((b) => {
    const label = `${b.code} · ${b.short}`;
    return {
      label,
      color: b.hex,
      width: padding * 2 + dot * 2 + gap + ctx.measureText(label).width,
    };
  });
  setLetterSpacing(ctx, '0px');
  const spacing = height * 0.25;
  return {
    items,
    width: items.reduce((sum, p) => sum + p.width, 0) + spacing * Math.max(0, items.length - 1),
  };
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  layout: PillLayout,
  x: number,
  y: number,
  font: number,
  height: number,
): void {
  const padding = height * 0.42;
  const dot = height * 0.16;
  const gap = height * 0.25;
  const spacing = height * 0.25;
  ctx.font = `700 ${font}px ${FONT_TEXT}`;
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, `${font * 0.08}px`);
  let cursor = x;
  for (const pill of layout.items) {
    ctx.beginPath();
    ctx.roundRect(cursor + 1, y + 1, pill.width - 2, height - 2, height / 2);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cursor + padding + dot, y + height / 2, dot, 0, Math.PI * 2);
    ctx.fillStyle = pill.color;
    ctx.fill();

    ctx.fillStyle = COLORS.ivory;
    ctx.fillText(pill.label, cursor + padding + dot * 2 + gap, y + height / 2 + 1);
    cursor += pill.width + spacing;
  }
  setLetterSpacing(ctx, '0px');
}

/** letterSpacing n'existe pas sur tous les navigateurs : ignoré s'il est absent. */
function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
  }
}

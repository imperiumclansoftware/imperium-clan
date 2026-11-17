import { RichDoc, RichNode } from './api/models';

/** Document vide de l'éditeur (un paragraphe sans texte). */
export const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Vrai si le document n'a ni texte ni image (même règle que App\News\RichText::isEmpty). */
export function isRichEmpty(doc: RichDoc | null | undefined): boolean {
  return !hasContent(doc?.content);
}

function hasContent(nodes: readonly RichNode[] | undefined): boolean {
  return (nodes ?? []).some(
    (n) =>
      n.type === 'image' ||
      (n.type === 'text' && (n.text ?? '').trim() !== '') ||
      hasContent(n.content),
  );
}

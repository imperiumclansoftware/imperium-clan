import { Pipe, PipeTransform } from '@angular/core';

/** Découpe un texte brut en paragraphes (lignes vides). Aucun HTML n'est interprété. */
@Pipe({ name: 'paragraphs' })
export class ParagraphsPipe implements PipeTransform {
  transform(text: string | null | undefined): string[] {
    return (text ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p !== '');
  }
}

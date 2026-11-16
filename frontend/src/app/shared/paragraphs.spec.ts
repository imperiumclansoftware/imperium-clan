import { ParagraphsPipe } from './paragraphs';

describe('ParagraphsPipe', () => {
  const pipe = new ParagraphsPipe();

  it('découpe sur les lignes vides et ignore les blancs', () => {
    expect(pipe.transform('Un\nsuite\n\n  \n\nDeux  ')).toEqual(['Un\nsuite', 'Deux']);
  });

  it('ne transforme pas le HTML', () => {
    expect(pipe.transform('<img src=x onerror=alert(1)>')).toEqual([
      '<img src=x onerror=alert(1)>',
    ]);
  });

  it('accepte null', () => {
    expect(pipe.transform(null)).toEqual([]);
  });
});

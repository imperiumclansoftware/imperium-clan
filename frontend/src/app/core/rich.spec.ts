import { EMPTY_DOC, isRichEmpty } from './rich';

describe('isRichEmpty', () => {
  it('considère vide un document sans texte ni image', () => {
    expect(isRichEmpty(EMPTY_DOC)).toBe(true);
    expect(isRichEmpty(null)).toBe(true);
    expect(
      isRichEmpty({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }],
      }),
    ).toBe(true);
  });

  it('ne considère pas vide un texte ou une image seule', () => {
    expect(
      isRichEmpty({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Salut' }] }],
      }),
    ).toBe(false);
    expect(
      isRichEmpty({
        type: 'doc',
        content: [{ type: 'image', attrs: { src: 'api/media/content/x.png', alt: '' } }],
      }),
    ).toBe(false);
  });
});

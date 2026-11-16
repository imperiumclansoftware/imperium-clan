import { TestBed } from '@angular/core/testing';
import { RichDoc } from '../core/api/models';
import { isSafeHref } from './rich-editor';
import { RichText } from './rich-text';

describe('RichText', () => {
  function render(doc: RichDoc): HTMLElement {
    const fixture = TestBed.createComponent(RichText);
    fixture.componentRef.setInput('doc', doc);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('rend les nœuds et les marques imbriquées sans HTML injecté', () => {
    const el = render({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Titre' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'gras italique', marks: [{ type: 'bold' }, { type: 'italic' }] },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'point' }] }],
            },
          ],
        },
      ],
    });

    expect(el.querySelector('h2')?.textContent).toBe('Titre');
    expect(el.querySelector('strong > em')?.textContent).toBe('gras italique');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.querySelector('ul li')?.textContent).toBe('point');
  });

  it('n’ajoute aucun espace entre un mot mis en forme et la ponctuation', () => {
    const el = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Salut ' },
            { type: 'text', text: 'clan', marks: [{ type: 'bold' }] },
            { type: 'text', text: ', à ce soir.' },
          ],
        },
      ],
    });

    expect(el.querySelector('p')?.textContent).toBe('Salut clan, à ce soir.');
  });

  it('ouvre les liens sans transmettre l’origine et neutralise javascript:', () => {
    const el = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'site',
              marks: [{ type: 'link', attrs: { href: 'https://www.imperiumclan.fr' } }],
            },
            {
              type: 'text',
              text: 'piège',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    });
    const [ok, evil] = Array.from(el.querySelectorAll('a'));

    expect(ok.getAttribute('rel')).toContain('noopener');
    expect(ok.getAttribute('href')).toBe('https://www.imperiumclan.fr');
    expect(evil.getAttribute('href')).toMatch(/^unsafe:/);
  });
});

describe('isSafeHref', () => {
  it('n’accepte que http(s) et mailto', () => {
    expect(isSafeHref('https://avenger.imperiumclan.fr')).toBe(true);
    expect(isSafeHref('mailto:contact@imperiumclan.fr')).toBe(true);
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,x')).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import { Sceau } from './sceau';

describe('Sceau', () => {
  it('allume uniquement les arcs des branches du membre', () => {
    const fixture = TestBed.createComponent(Sceau);
    fixture.componentRef.setInput('branches', ['ICS', 'ICG']);
    fixture.componentRef.setInput('size', 96);
    fixture.detectChanges();

    const strokes = Array.from(
      fixture.nativeElement.querySelectorAll(
        'path[stroke-width="14"]',
      ) as NodeListOf<SVGPathElement>,
    ).map((p) => p.style.stroke);
    expect(strokes).toEqual([
      'rgb(255, 70, 85)',
      'rgb(42, 42, 49)',
      'rgb(42, 42, 49)',
      'rgb(43, 217, 159)',
    ]);
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-label')).toBe(
      'Sceau Imperium : Imperium Clan Gaming, Imperium Clan Software',
    );
  });
});

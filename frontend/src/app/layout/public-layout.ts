import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { backgroundUrl } from '../core/backgrounds';
import { BranchTheme } from '../core/branch-theme';
import { Bandeau } from '../shared/bandeau';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Bandeau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="entete">
      <div class="conteneur barre">
        <a routerLink="/" class="marque" aria-label="Imperium Clan — accueil">
          <img
            src="brand/imperium-logo-horizontal-fond-sombre.svg"
            alt=""
            width="200"
            height="59"
          />
        </a>
        <button
          type="button"
          class="btn btn-secondaire btn-petit menu-bouton"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="navigation"
          (click)="menuOpen.set(!menuOpen())"
        >
          Menu
        </button>
        <nav id="navigation" aria-label="Navigation principale" [class.ouvert]="menuOpen()">
          <ul role="list">
            @for (link of links; track link.path) {
              <li>
                <a [routerLink]="link.path" routerLinkActive="actif" ariaCurrentWhenActive="page">{{
                  link.label
                }}</a>
              </li>
            }
          </ul>
          @if (auth.isAuthenticated()) {
            <div class="compte">
              @if (auth.isEditor()) {
                <a routerLink="/admin" class="btn btn-secondaire btn-petit">Admin</a>
              }
              <button
                type="button"
                class="btn btn-secondaire btn-petit icone"
                (click)="logout()"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>
          } @else {
            <a routerLink="/rejoindre" class="btn btn-principal btn-petit">Rejoindre le clan</a>
          }
        </nav>
      </div>
    </header>

    <main id="contenu" tabindex="-1">
      <!-- Fond du clan sur tout le site ; il s'efface en fondu dans une zone de branche (qui a le sien). -->
      <div class="fond-site" aria-hidden="true" [class.masque]="theme.current() !== null">
        <img [src]="fondClan" alt="" fetchpriority="high" />
      </div>
      <router-outlet />
    </main>

    <footer class="pied">
      <div class="conteneur pied-contenu">
        <div class="pile">
          <p class="gothique pied-titre">Imperium</p>
          <p class="secondaire">Jouer, regarder, raconter, coder.</p>
        </div>
        <nav aria-label="Liens de pied de page">
          <ul role="list" class="liens-apps">
            <li>
              <a href="https://www.imperiumclan.fr" rel="noopener">
                <img src="brand/apps/conclave.svg" alt="" width="24" height="24" />Conclave
              </a>
            </li>
            <li>
              <a href="https://avenger.imperiumclan.fr" rel="noopener">
                <img src="brand/apps/avenger.svg" alt="" width="24" height="24" />Avenger
              </a>
            </li>
            <li>
              <a routerLink="/admin">
                <span class="icone-app" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg> </span
                >Administration
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <app-bandeau />
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
      outline: none;
      position: relative;
      isolation: isolate;
    }
    .fond-site {
      position: absolute;
      inset: 0 0 auto 0;
      height: clamp(560px, 46vw, 720px);
      overflow: hidden;
      pointer-events: none;
      z-index: -1;
      transition: opacity 0.7s ease;
    }
    .fond-site.masque {
      opacity: 0;
    }
    .fond-site img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* Voile : lisibilité des titres et fondu dans la couleur de la page. */
    .fond-site::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgb(14 14 16 / 0.4),
        rgb(14 14 16 / 0.65) 55%,
        var(--imp-noir)
      );
    }
    .entete {
      /* Liseré à la couleur d'accent : gris en neutre, couleur de la branche dans sa zone (animé). */
      border-bottom: 2px solid var(--accent-trait);
      background: var(--imp-noir);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .barre {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--imp-e-4);
      min-height: 76px;
      flex-wrap: wrap;
    }
    .marque img {
      width: 180px;
      height: auto;
    }
    nav ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    #navigation {
      display: none;
      width: 100%;
      padding-bottom: var(--imp-e-4);
      gap: var(--imp-e-3);
      flex-direction: column;
      align-items: stretch;
    }
    #navigation.ouvert {
      display: flex;
    }
    #navigation ul {
      display: grid;
      gap: var(--imp-e-1);
    }
    #navigation ul a {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--imp-e-3);
      border-radius: var(--imp-rayon-m);
      text-decoration: none;
      color: var(--imp-gris-sombre);
      font-weight: 500;
    }
    #navigation ul a:hover {
      color: var(--imp-ivoire);
      background: var(--imp-panneau);
    }
    #navigation ul a.actif {
      color: var(--imp-ivoire);
      background: var(--imp-panneau);
      box-shadow: inset 0 -2px 0 var(--accent);
    }
    @media (min-width: 1024px) {
      .menu-bouton {
        display: none;
      }
      #navigation,
      #navigation.ouvert {
        display: flex;
        width: auto;
        padding: 0;
        flex-direction: row;
        align-items: center;
        gap: var(--imp-e-5);
      }
      #navigation ul {
        display: flex;
        gap: var(--imp-e-1);
      }
    }
    .compte .icone {
      width: 44px;
      padding: 0;
    }
    .compte {
      display: flex;
      gap: var(--imp-e-2);
      flex-wrap: wrap;
    }
    .pied {
      border-top: 1px solid var(--imp-trait);
      margin-top: var(--imp-e-8);
    }
    .pied-contenu {
      display: flex;
      justify-content: space-between;
      gap: var(--imp-e-6);
      flex-wrap: wrap;
      padding-top: var(--imp-e-7);
      padding-bottom: var(--imp-e-7);
    }
    .pied-titre {
      font-size: var(--imp-taille-titre-s);
      line-height: 1;
    }
    /* Liens des applications sur une ligne (retour à la ligne sur petit écran). */
    .liens-apps {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--imp-e-2) var(--imp-e-6);
    }
    .pied ul a {
      color: var(--imp-gris-sombre);
      text-decoration: none;
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      gap: var(--imp-e-3);
    }
    /* Icônes des applications : même taille et même arrondi pour toutes. */
    .pied ul a img,
    .icone-app {
      width: 24px;
      height: 24px;
      flex: none;
      border-radius: 6px;
    }
    .icone-app {
      display: grid;
      place-items: center;
      border: 1px solid var(--imp-trait-fort);
      color: var(--imp-ivoire);
    }
    .pied ul a:hover {
      color: var(--imp-ivoire);
      text-decoration: underline;
    }
  `,
})
export class PublicLayout {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(BranchTheme);
  protected readonly fondClan = backgroundUrl('clan');
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly links = [
    { path: '/le-clan', label: 'Le clan' },
    { path: '/branches', label: 'Branches' },
    { path: '/membres', label: 'Membres' },
    { path: '/outils', label: 'Outils' },
    { path: '/actualites', label: 'Actualités' },
    { path: '/galerie', label: 'Galerie' },
    { path: '/ressources', label: 'Ressources' },
  ];

  protected logout(): void {
    this.auth.logout().subscribe({ complete: () => void this.router.navigate(['/']) });
  }

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }
}

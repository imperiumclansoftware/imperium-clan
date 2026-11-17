import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Sceau } from '../shared/sceau';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sceau],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#admin-contenu">Aller au contenu</a>
    <div class="admin">
      <aside class="cote">
        <a routerLink="/admin" class="marque">
          <app-sceau [size]="40" [decorative]="true" />
          <span
            ><span class="gothique">Imperium</span><span class="libelle">Administration</span></span
          >
        </a>
        <nav aria-label="Administration">
          <ul role="list">
            @for (link of links(); track link.path) {
              <li>
                <a
                  [routerLink]="link.path"
                  routerLinkActive="actif"
                  [routerLinkActiveOptions]="{ exact: link.exact }"
                  ariaCurrentWhenActive="page"
                  >{{ link.label }}</a
                >
              </li>
            }
          </ul>
        </nav>
        <div class="compte">
          <p class="secondaire">{{ auth.currentUser()?.displayName }}</p>
          <div class="ligne">
            <a routerLink="/" class="btn btn-secondaire btn-petit">Voir le site</a>
            <a routerLink="/ressources" class="btn btn-secondaire btn-petit">Espace membre</a>
            <button type="button" class="btn btn-secondaire btn-petit" (click)="logout()">
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      <main id="admin-contenu" tabindex="-1" class="contenu">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .admin {
      display: grid;
      min-height: 100vh;
    }
    @media (min-width: 960px) {
      .admin {
        grid-template-columns: 260px 1fr;
      }
    }
    .cote {
      background: var(--imp-panneau);
      border-right: 1px solid var(--imp-trait);
      padding: var(--imp-e-5);
      display: grid;
      gap: var(--imp-e-5);
      align-content: start;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: var(--imp-e-3);
      text-decoration: none;
    }
    .marque .gothique {
      display: block;
      font-size: 1.6rem;
      line-height: 1;
    }
    nav ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--imp-e-1);
    }
    nav a {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--imp-e-3);
      border-radius: var(--imp-rayon-m);
      text-decoration: none;
      color: var(--imp-gris-sombre);
      font-weight: 500;
    }
    nav a:hover {
      color: var(--imp-ivoire);
      background: var(--imp-panneau-2);
    }
    nav a.actif {
      color: var(--imp-ivoire);
      background: var(--imp-panneau-2);
    }
    .compte {
      display: grid;
      gap: var(--imp-e-3);
      border-top: 1px solid var(--imp-trait);
      padding-top: var(--imp-e-4);
    }
    .contenu {
      padding: var(--imp-e-6) var(--imp-e-4);
      outline: none;
      min-width: 0;
    }
    @media (min-width: 768px) {
      .contenu {
        padding: var(--imp-e-7);
      }
    }
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly links = computed(() => {
    const all = [
      { path: '/admin', label: 'Tableau de bord', exact: true, admin: false },
      { path: '/admin/actualites', label: 'Actualités', exact: false, admin: false },
      { path: '/admin/galerie', label: 'Galerie', exact: false, admin: false },
      { path: '/admin/presentation', label: 'Présentation', exact: false, admin: true },
      { path: '/admin/branches', label: 'Branches', exact: false, admin: true },
      { path: '/admin/outils', label: 'Outils', exact: false, admin: true },
      { path: '/admin/membres', label: 'Membres', exact: false, admin: true },
      { path: '/admin/candidatures', label: 'Candidatures', exact: false, admin: true },
      { path: '/admin/ressources', label: 'Ressources', exact: false, admin: true },
    ];
    return all.filter((l) => !l.admin || this.auth.isAdmin());
  });

  protected logout(): void {
    this.auth.logout().subscribe({ complete: () => void this.router.navigate(['/']) });
  }
}

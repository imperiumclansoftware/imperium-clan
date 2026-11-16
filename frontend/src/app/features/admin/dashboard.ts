import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pile entete">
      <p class="libelle">Tableau de bord</p>
      <h1>Salut, {{ auth.currentUser()?.displayName }}</h1>
    </header>
    <div class="grille">
      <a routerLink="/admin/actualites" class="carte"
        ><h2>Actualités</h2>
        <p class="secondaire">Rédiger, programmer et publier les news du clan.</p></a
      >
      <a routerLink="/admin/galerie" class="carte"
        ><h2>Galerie</h2>
        <p class="secondaire">Ajouter des images et leurs légendes.</p></a
      >
      @if (auth.isAdmin()) {
        <a routerLink="/admin/candidatures" class="carte"
          ><h2>Candidatures</h2>
          <p class="secondaire">Lire et traiter les demandes pour rejoindre le clan.</p></a
        >
        <a routerLink="/admin/presentation" class="carte"
          ><h2>Présentation</h2>
          <p class="secondaire">
            Histoire, valeurs, règlement : les sections de la page « Le clan ».
          </p></a
        >
        <a routerLink="/admin/outils" class="carte"
          ><h2>Outils</h2>
          <p class="secondaire">Conclave, Avenger… et leurs branches.</p></a
        >
        <a routerLink="/admin/membres" class="carte"
          ><h2>Membres</h2>
          <p class="secondaire">Membres synchronisés depuis Conclave.</p></a
        >
        <a routerLink="/admin/branches" class="carte"
          ><h2>Branches</h2>
          <p class="secondaire">Présentation de la zone de chaque branche.</p></a
        >
        <a routerLink="/admin/ressources" class="carte"
          ><h2>Ressources</h2>
          <p class="secondaire">Logos et fichiers téléchargeables par les membres.</p></a
        >
      }
    </div>
  `,
  styles: `
    .entete {
      margin-bottom: var(--imp-e-6);
    }
  `,
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
}

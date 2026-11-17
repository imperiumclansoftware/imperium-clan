import { Routes } from '@angular/router';
import { adminGuard, editorGuard, memberGuard } from './core/auth.guard';
import { PublicLayout } from './layout/public-layout';

const site = (title: string): string => `${title} · Imperium Clan`;

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        title: 'Imperium Clan',
        loadComponent: () => import('./features/public/home').then((m) => m.Home),
      },
      {
        path: 'le-clan',
        title: site('Le clan'),
        loadComponent: () => import('./features/public/clan').then((m) => m.Clan),
      },
      {
        path: 'branches',
        title: site('Branches'),
        loadComponent: () =>
          import('./features/public/branches-index').then((m) => m.BranchesIndex),
      },
      {
        path: 'branches/:code',
        title: site('Branche'),
        loadComponent: () => import('./features/public/branch-zone').then((m) => m.BranchZone),
      },
      {
        path: 'membres',
        title: site('Membres'),
        loadComponent: () => import('./features/public/members').then((m) => m.Members),
      },
      {
        path: 'outils',
        title: site('Outils'),
        loadComponent: () => import('./features/public/tools').then((m) => m.Tools),
      },
      {
        path: 'actualites',
        title: site('Actualités'),
        loadComponent: () => import('./features/public/news-list').then((m) => m.NewsList),
      },
      {
        path: 'actualites/:slug',
        title: site('Actualité'),
        loadComponent: () => import('./features/public/news-detail').then((m) => m.NewsDetail),
      },
      {
        path: 'galerie',
        title: site('Galerie'),
        loadComponent: () => import('./features/public/gallery').then((m) => m.Gallery),
      },
      {
        path: 'galerie/:slug',
        title: site('Galerie'),
        loadComponent: () =>
          import('./features/public/gallery-event').then((m) => m.GalleryEventPage),
      },
      {
        path: 'rejoindre',
        title: site('Rejoindre le clan'),
        loadComponent: () => import('./features/public/join').then((m) => m.Join),
      },
      {
        path: 'ressources',
        canActivate: [memberGuard],
        title: site('Ressources'),
        loadComponent: () => import('./features/member/resources').then((m) => m.Resources),
      },
      {
        path: 'ressources/banniere',
        canActivate: [memberGuard],
        title: site('Générateur de bannière'),
        loadComponent: () =>
          import('./features/member/banner-generator').then((m) => m.BannerGenerator),
      },
    ],
  },
  {
    path: 'connexion',
    title: site('Connexion'),
    loadComponent: () => import('./features/member/login').then((m) => m.Login),
  },
  {
    path: 'installation',
    title: site('Installation'),
    loadComponent: () => import('./features/setup/installation').then((m) => m.Installation),
  },
  { path: 'admin/connexion', redirectTo: 'connexion' },
  {
    path: 'admin',
    canActivate: [editorGuard],
    loadComponent: () => import('./layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: site('Administration'),
        loadComponent: () => import('./features/admin/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'actualites',
        title: site('Actualités — admin'),
        loadComponent: () => import('./features/admin/news-admin').then((m) => m.NewsAdmin),
      },
      {
        path: 'actualites/nouvelle',
        title: site('Nouvelle actualité'),
        loadComponent: () => import('./features/admin/news-editor').then((m) => m.NewsEditor),
      },
      {
        path: 'actualites/:id',
        title: site('Modifier l’actualité'),
        loadComponent: () => import('./features/admin/news-editor').then((m) => m.NewsEditor),
      },
      {
        path: 'galerie',
        title: site('Galerie — admin'),
        loadComponent: () => import('./features/admin/gallery-admin').then((m) => m.GalleryAdmin),
      },
      {
        path: 'presentation',
        canActivate: [adminGuard],
        title: site('Présentation — admin'),
        loadComponent: () => import('./features/admin/pages-admin').then((m) => m.PagesAdmin),
      },
      {
        path: 'branches',
        canActivate: [adminGuard],
        title: site('Branches — admin'),
        loadComponent: () => import('./features/admin/branches-admin').then((m) => m.BranchesAdmin),
      },
      {
        path: 'outils',
        canActivate: [adminGuard],
        title: site('Outils — admin'),
        loadComponent: () => import('./features/admin/tools-admin').then((m) => m.ToolsAdmin),
      },
      {
        path: 'membres',
        canActivate: [adminGuard],
        title: site('Membres — admin'),
        loadComponent: () => import('./features/admin/members-admin').then((m) => m.MembersAdmin),
      },
      {
        path: 'candidatures',
        canActivate: [adminGuard],
        title: site('Candidatures'),
        loadComponent: () =>
          import('./features/admin/join-requests-admin').then((m) => m.JoinRequestsAdmin),
      },
      {
        path: 'comptes',
        canActivate: [adminGuard],
        title: site('Comptes — admin'),
        loadComponent: () => import('./features/admin/accounts-admin').then((m) => m.AccountsAdmin),
      },
      {
        path: 'ressources',
        canActivate: [adminGuard],
        title: site('Ressources — admin'),
        loadComponent: () =>
          import('./features/admin/resources-admin').then((m) => m.ResourcesAdmin),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { ViewportScroller, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api.interceptor';
import { AuthService } from './core/auth.service';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      // CSRF « double submit » : HttpClient recopie le cookie XSRF-TOKEN posé par Symfony
      // dans l'en-tête X-XSRF-TOKEN sur les requêtes POST/PUT/PATCH/DELETE same-origin.
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([apiInterceptor]),
    ),
    // Session au démarrage (sans bloquer l'affichage) : sait si l'on est connecté et pose le cookie
    // XSRF-TOKEN, sans lequel le premier envoi d'un formulaire serait refusé.
    // Défilement vers une ancre (#section) : laisse la place à l'en-tête collant du site.
    provideAppInitializer(() => inject(ViewportScroller).setOffset([0, 100])),
    provideAppInitializer(() => {
      inject(AuthService).refresh().subscribe();
    }),
  ],
};

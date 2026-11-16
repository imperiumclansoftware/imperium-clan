import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('envoie les credentials uniquement vers l’API', () => {
    http.get('api/public/tools').subscribe();
    http.get('https://cdn.example.com/data.json').subscribe();

    expect(backend.expectOne('api/public/tools').request.withCredentials).toBe(true);
    expect(backend.expectOne('https://cdn.example.com/data.json').request.withCredentials).toBe(
      false,
    );
  });

  it('redirige vers la connexion sur 401 d’une route d’administration', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get('api/admin/tools').subscribe({ error: () => undefined });

    backend.expectOne('api/admin/tools').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).toHaveBeenCalledWith(['/connexion'], { queryParams: { retour: '/' } });
  });

  it('ne redirige pas pour une route publique', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get('api/session').subscribe({ error: () => undefined });

    backend.expectOne('api/session').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
  });
});

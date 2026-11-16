import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Items, Resource } from './models';

/** API de l'espace membre (ROLE_MEMBER, vérifié côté Symfony). */
@Injectable({ providedIn: 'root' })
export class MemberApi {
  private readonly http = inject(HttpClient);

  resources(): Observable<Resource[]> {
    return this.http.get<Items<Resource>>('api/member/resources').pipe(map((r) => r.items));
  }
}

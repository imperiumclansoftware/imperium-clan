import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BranchCode } from '../branches';
import {
  BranchProfile,
  ClanPage,
  GalleryEvent,
  GalleryEventDetail,
  GalleryImage,
  Items,
  JoinRequestInput,
  Member,
  News,
  NewsSummary,
  Tool,
} from './models';

/** API publique : lecture seule, sans authentification. */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);

  members(): Observable<Member[]> {
    return this.http.get<Items<Member>>('api/public/members').pipe(map((r) => r.items));
  }

  tools(): Observable<Tool[]> {
    return this.http.get<Items<Tool>>('api/public/tools').pipe(map((r) => r.items));
  }

  pages(): Observable<ClanPage[]> {
    return this.http.get<Items<ClanPage>>('api/public/pages').pipe(map((r) => r.items));
  }

  branches(): Observable<BranchProfile[]> {
    return this.http.get<Items<BranchProfile>>('api/public/branches').pipe(map((r) => r.items));
  }

  news(page = 1, size = 12, branch?: BranchCode): Observable<NewsSummary[]> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (branch) {
      params = params.set('branch', branch);
    }
    return this.http
      .get<Items<NewsSummary>>('api/public/news', { params })
      .pipe(map((r) => r.items));
  }

  article(slug: string): Observable<News> {
    return this.http.get<News>(`api/public/news/${encodeURIComponent(slug)}`);
  }

  gallery(page = 1): Observable<GalleryImage[]> {
    const params = new HttpParams().set('page', page);
    return this.http
      .get<Items<GalleryImage>>('api/public/gallery', { params })
      .pipe(map((r) => r.items));
  }

  galleryEvents(): Observable<GalleryEvent[]> {
    return this.http
      .get<Items<GalleryEvent>>('api/public/gallery/events')
      .pipe(map((r) => r.items));
  }

  galleryEvent(slug: string): Observable<GalleryEventDetail> {
    return this.http.get<GalleryEventDetail>(
      `api/public/gallery/events/${encodeURIComponent(slug)}`,
    );
  }

  join(input: JoinRequestInput): Observable<void> {
    return this.http.post<unknown>('api/public/join-requests', input).pipe(map(() => undefined));
  }
}

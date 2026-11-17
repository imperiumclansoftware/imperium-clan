import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ClanRank } from '../ranks';
import { Observable, map } from 'rxjs';
import {
  AdminClanPage,
  AdminGalleryEvent,
  GalleryEventInput,
  RichDoc,
  BranchProfile,
  AdminAccount,
  AdminMember,
  AdminResource,
  ResourceCategory,
  ResourceInput,
  AdminTool,
  ClanPageInput,
  GalleryImage,
  Items,
  JoinRequest,
  JoinRequestStatus,
  News,
  NewsInput,
  NewsSummary,
  ToolInput,
} from './models';

const id = (value: string): string => encodeURIComponent(value);

/** API d'administration. Chaque route est protégée côté Symfony (rôles) : l'interface ne fait que suivre. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  // Outils
  tools(): Observable<AdminTool[]> {
    return this.http.get<Items<AdminTool>>('api/admin/tools').pipe(map((r) => r.items));
  }
  createTool(input: ToolInput): Observable<AdminTool> {
    return this.http.post<AdminTool>('api/admin/tools', input);
  }
  updateTool(toolId: string, input: ToolInput): Observable<AdminTool> {
    return this.http.put<AdminTool>(`api/admin/tools/${id(toolId)}`, input);
  }
  deleteTool(toolId: string): Observable<void> {
    return this.http.delete<unknown>(`api/admin/tools/${id(toolId)}`).pipe(map(() => undefined));
  }

  // Présentation
  pages(): Observable<AdminClanPage[]> {
    return this.http.get<Items<AdminClanPage>>('api/admin/pages').pipe(map((r) => r.items));
  }
  createPage(input: ClanPageInput): Observable<AdminClanPage> {
    return this.http.post<AdminClanPage>('api/admin/pages', input);
  }
  updatePage(pageId: string, input: ClanPageInput): Observable<AdminClanPage> {
    return this.http.put<AdminClanPage>(`api/admin/pages/${id(pageId)}`, input);
  }
  deletePage(pageId: string): Observable<void> {
    return this.http.delete<unknown>(`api/admin/pages/${id(pageId)}`).pipe(map(() => undefined));
  }

  // Actualités
  news(page = 1): Observable<NewsSummary[]> {
    return this.http
      .get<Items<NewsSummary>>('api/admin/news', { params: new HttpParams().set('page', page) })
      .pipe(map((r) => r.items));
  }
  article(newsId: string): Observable<News> {
    return this.http.get<News>(`api/admin/news/${id(newsId)}`);
  }
  createNews(input: NewsInput): Observable<News> {
    return this.http.post<News>('api/admin/news', input);
  }
  updateNews(newsId: string, input: NewsInput): Observable<News> {
    return this.http.put<News>(`api/admin/news/${id(newsId)}`, input);
  }
  /** Image insérée dans un texte riche : renvoie son URL (api/media/content/…). */
  uploadContentImage(file: File): Observable<{ url: string; width: number; height: number }> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ url: string; width: number; height: number }>(
      'api/admin/content-images',
      body,
    );
  }
  uploadCover(newsId: string, file: File): Observable<News> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<News>(`api/admin/news/${id(newsId)}/cover`, body);
  }
  removeCover(newsId: string): Observable<News> {
    return this.http.delete<News>(`api/admin/news/${id(newsId)}/cover`);
  }
  deleteNews(newsId: string): Observable<void> {
    return this.http.delete<unknown>(`api/admin/news/${id(newsId)}`).pipe(map(() => undefined));
  }

  // Galerie
  /** eventId : images d'un événement ; 'none' : hors événement ; absent : toutes. */
  gallery(eventId?: string): Observable<GalleryImage[]> {
    const params = eventId ? new HttpParams().set('event', eventId) : undefined;
    return this.http
      .get<Items<GalleryImage>>('api/admin/gallery', { params })
      .pipe(map((r) => r.items));
  }
  uploadImage(file: File, caption: string, eventId?: string | null): Observable<GalleryImage> {
    const body = new FormData();
    body.append('file', file);
    body.append('caption', caption);
    if (eventId) {
      body.append('event', eventId);
    }
    return this.http.post<GalleryImage>('api/admin/gallery', body);
  }
  updateCaption(imageId: string, caption: string): Observable<GalleryImage> {
    return this.http.put<GalleryImage>(`api/admin/gallery/${id(imageId)}`, { caption });
  }
  deleteImage(imageId: string): Observable<void> {
    return this.http.delete<unknown>(`api/admin/gallery/${id(imageId)}`).pipe(map(() => undefined));
  }

  // Candidatures
  joinRequests(): Observable<JoinRequest[]> {
    return this.http.get<Items<JoinRequest>>('api/admin/join-requests').pipe(map((r) => r.items));
  }
  decide(requestId: string, status: JoinRequestStatus): Observable<JoinRequest> {
    return this.http.put<JoinRequest>(`api/admin/join-requests/${id(requestId)}`, { status });
  }
  deleteJoinRequest(requestId: string): Observable<void> {
    return this.http
      .delete<unknown>(`api/admin/join-requests/${id(requestId)}`)
      .pipe(map(() => undefined));
  }

  // Membres
  members(): Observable<{ items: AdminMember[]; syncConfigured: boolean }> {
    return this.http.get<{ items: AdminMember[]; syncConfigured: boolean }>('api/admin/members');
  }
  accounts(): Observable<AdminAccount[]> {
    return this.http.get<Items<AdminAccount>>('api/admin/accounts').pipe(map((r) => r.items));
  }
  setAccountAdmin(accountId: string, admin: boolean): Observable<AdminAccount> {
    return this.http.put<AdminAccount>(`api/admin/accounts/${id(accountId)}/admin`, { admin });
  }
  setMemberRank(memberId: string, rank: ClanRank): Observable<AdminMember> {
    return this.http.put<AdminMember>(`api/admin/members/${id(memberId)}/rank`, { rank });
  }
  syncMembers(): Observable<{ created: number; updated: number; removed: number }> {
    return this.http.post<{ created: number; updated: number; removed: number }>(
      'api/admin/members/sync',
      null,
    );
  }

  // Ressources membres
  resources(): Observable<AdminResource[]> {
    return this.http.get<Items<AdminResource>>('api/admin/resources').pipe(map((r) => r.items));
  }
  uploadResource(file: File, category: ResourceCategory): Observable<AdminResource> {
    const body = new FormData();
    body.append('file', file);
    body.append('category', category);
    return this.http.post<AdminResource>('api/admin/resources', body);
  }
  updateResource(resourceId: string, input: ResourceInput): Observable<AdminResource> {
    return this.http.put<AdminResource>(`api/admin/resources/${id(resourceId)}`, input);
  }
  deleteResource(resourceId: string): Observable<void> {
    return this.http
      .delete<unknown>(`api/admin/resources/${id(resourceId)}`)
      .pipe(map(() => undefined));
  }

  // Présentation des branches
  updateBranch(
    code: string,
    input: { intro: string; content: RichDoc },
  ): Observable<BranchProfile> {
    return this.http.put<BranchProfile>(`api/admin/branches/${id(code)}`, input);
  }

  moveImages(ids: string[], eventId: string | null): Observable<number> {
    return this.http
      .post<{ moved: number }>('api/admin/gallery/move', { ids, event: eventId })
      .pipe(map((r) => r.moved));
  }

  // Événements de la galerie
  galleryEvents(): Observable<AdminGalleryEvent[]> {
    return this.http
      .get<Items<AdminGalleryEvent>>('api/admin/gallery/events')
      .pipe(map((r) => r.items));
  }
  createGalleryEvent(input: GalleryEventInput): Observable<AdminGalleryEvent> {
    return this.http.post<AdminGalleryEvent>('api/admin/gallery/events', input);
  }
  updateGalleryEvent(eventId: string, input: GalleryEventInput): Observable<AdminGalleryEvent> {
    return this.http.put<AdminGalleryEvent>(`api/admin/gallery/events/${id(eventId)}`, input);
  }
  deleteGalleryEvent(eventId: string): Observable<void> {
    return this.http
      .delete<unknown>(`api/admin/gallery/events/${id(eventId)}`)
      .pipe(map(() => undefined));
  }
}

import { BranchCode } from '../branches';

/** Miroir de backend/src/Api/Presenter.php. */
export interface Member {
  readonly id: string;
  readonly pseudo: string;
  readonly title: string | null;
  readonly bio: string | null;
  readonly branches: readonly BranchCode[];
  readonly avatarUrl: string | null;
}

export interface AdminMember extends Member {
  readonly syncedAt: string;
}

export interface Tool {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly description: string;
  readonly branches: readonly BranchCode[];
}

export interface AdminTool extends Tool {
  readonly position: number;
  readonly published: boolean;
}

export interface ClanPage {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Texte riche (JSON de l'éditeur) ; un ancien texte simple arrive converti en paragraphes. */
  readonly content: RichDoc;
}

export interface AdminClanPage extends ClanPage {
  readonly position: number;
  readonly published: boolean;
}

export interface NewsSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly author: string;
  readonly branches: readonly BranchCode[];
  readonly publishedAt: string | null;
  readonly coverUrl: string | null;
}

export interface News extends NewsSummary {
  readonly content: RichDoc;
}

/** Texte riche du site (JSON de l'éditeur Tiptap), nettoyé côté serveur par App\News\RichText. */
export type RichMarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'link';

export interface RichMark {
  readonly type: RichMarkType;
  readonly attrs?: { readonly href?: string };
}

export interface RichNode {
  readonly type: string;
  /** level : intertitres ; src, alt : images (uniquement api/media/content/…, vérifié par le serveur) */
  readonly attrs?: { readonly level?: number; readonly src?: string; readonly alt?: string };
  readonly content?: readonly RichNode[];
  readonly text?: string;
  readonly marks?: readonly RichMark[];
}

export interface RichDoc {
  readonly type: 'doc';
  readonly content: readonly RichNode[];
}

export interface GalleryImage {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
  readonly createdAt: string;
  /** Administration uniquement : événement de rattachement (null = hors événement). */
  readonly eventId?: string | null;
}

export interface GalleryEvent {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Date de l'événement, AAAA-MM-JJ. */
  readonly date: string;
  /** Texte riche (JSON de l'éditeur), éventuellement vide. */
  readonly description: RichDoc;
  readonly branches: readonly BranchCode[];
  readonly imageCount: number;
  readonly coverUrl: string | null;
}

export interface AdminGalleryEvent extends GalleryEvent {
  readonly published: boolean;
  readonly coverImageId: string | null;
}

export interface GalleryEventDetail extends GalleryEvent {
  readonly images: GalleryImage[];
}

export interface GalleryEventInput {
  title: string;
  date: string;
  description: RichDoc;
  branches: BranchCode[];
  published: boolean;
  coverImageId: string | null;
}

export type JoinRequestStatus = 'new' | 'accepted' | 'rejected';

export interface JoinRequest {
  readonly id: string;
  readonly pseudo: string;
  readonly email: string;
  readonly discord: string | null;
  readonly message: string;
  readonly branches: readonly BranchCode[];
  readonly status: JoinRequestStatus;
  readonly createdAt: string;
  readonly decidedAt: string | null;
}

export interface Items<T> {
  readonly items: T[];
}

export interface ToolInput {
  name: string;
  url: string;
  description: string;
  branches: BranchCode[];
  position: number;
  published: boolean;
}

export interface ClanPageInput {
  slug: string;
  title: string;
  content: RichDoc;
  position: number;
  published: boolean;
}

export interface NewsInput {
  title: string;
  excerpt: string;
  content: RichDoc;
  branches: BranchCode[];
  publishedAt: string | null;
}

export interface JoinRequestInput {
  pseudo: string;
  email: string;
  discord: string | null;
  message: string;
  branches: BranchCode[];
  consent: boolean;
  website: string;
}

export type ResourceCategory = 'graphics' | 'social';

export interface Resource {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: ResourceCategory;
  readonly format: string;
  readonly size: number;
  readonly downloadUrl: string;
  readonly previewUrl: string | null;
}

export interface AdminResource extends Resource {
  readonly position: number;
  readonly published: boolean;
}

export interface ResourceInput {
  title: string;
  category: ResourceCategory;
  description: string;
  position: number;
  published: boolean;
}

export interface BranchProfile {
  readonly code: BranchCode;
  readonly name: string;
  readonly short: string;
  readonly intro: string;
  /** Présentation (texte riche), affichée sous l'accroche dans la zone de la branche. */
  readonly content: RichDoc;
}

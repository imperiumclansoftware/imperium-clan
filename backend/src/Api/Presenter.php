<?php

declare(strict_types=1);

namespace App\Api;

use App\Entity\BranchProfile;
use App\Entity\ClanPage;
use App\Entity\GalleryEvent;
use App\Entity\GalleryImage;
use App\Entity\JoinRequest;
use App\Entity\Member;
use App\Entity\NewsArticle;
use App\Entity\Resource;
use App\Entity\Tool;
use App\Enum\Branch;
use App\Media\ResourceStorage;
use App\News\RichText;

/**
 * Sorties explicites de l'API : seuls les champs listés ici quittent le serveur.
 * Miroir côté Angular : frontend/src/app/core/api/models.ts.
 */
final class Presenter
{
    /** @return array<string, mixed> */
    public static function member(Member $m): array
    {
        return [
            'id' => (string) $m->getId(),
            'pseudo' => $m->getPseudo(),
            'title' => $m->getTitle(),
            'bio' => $m->getBio(),
            'branches' => Branch::toValues($m->getBranches()),
            'avatarUrl' => self::media('avatars', $m->getAvatarFile()),
        ];
    }

    /** @return array<string, mixed> */
    public static function adminMember(Member $m): array
    {
        return self::member($m) + ['syncedAt' => $m->getSyncedAt()->format(\DATE_ATOM)];
    }

    /** @return array<string, mixed> */
    public static function branchProfile(BranchProfile $p): array
    {
        $b = $p->getBranch();

        return ['code' => $b->value, 'name' => $b->label(), 'short' => $b->shortName(), 'intro' => $p->getIntro(), 'content' => RichText::decode($p->getBody())];
    }

    /** @return array<string, mixed> */
    public static function tool(Tool $t, bool $admin = false): array
    {
        $out = [
            'id' => (string) $t->getId(),
            'name' => $t->getName(),
            'url' => $t->getUrl(),
            'description' => $t->getDescription(),
            'branches' => Branch::toValues($t->getBranches()),
        ];

        return $admin ? $out + ['position' => $t->getPosition(), 'published' => $t->isPublished()] : $out;
    }

    /** @return array<string, mixed> */
    public static function page(ClanPage $p, bool $admin = false): array
    {
        $out = ['id' => (string) $p->getId(), 'slug' => $p->getSlug(), 'title' => $p->getTitle(), 'content' => RichText::decode($p->getBody())];

        return $admin ? $out + ['position' => $p->getPosition(), 'published' => $p->isPublished()] : $out;
    }

    /** @return array<string, mixed> */
    public static function newsSummary(NewsArticle $n): array
    {
        return [
            'id' => (string) $n->getId(),
            'slug' => $n->getSlug(),
            'title' => $n->getTitle(),
            'excerpt' => $n->getExcerpt(),
            'author' => $n->getAuthor(),
            'branches' => Branch::toValues($n->getBranches()),
            'publishedAt' => $n->getPublishedAt()?->format(\DATE_ATOM),
            'coverUrl' => self::media('news', $n->getCoverFile()),
        ];
    }

    /** @return array<string, mixed> */
    public static function news(NewsArticle $n): array
    {
        return self::newsSummary($n) + ['content' => RichText::decode($n->getBody())];
    }

    /** @return array<string, mixed> */
    public static function galleryEvent(GalleryEvent $e, int $imageCount, ?GalleryImage $cover, bool $admin = false): array
    {
        $out = [
            'id' => (string) $e->getId(),
            'slug' => $e->getSlug(),
            'title' => $e->getTitle(),
            'date' => $e->getDate()->format('Y-m-d'),
            'description' => RichText::decode($e->getDescription()),
            'branches' => Branch::toValues($e->getBranches()),
            'imageCount' => $imageCount,
            'coverUrl' => null === $cover ? null : self::media('gallery', $cover->getFile()),
        ];

        return $admin ? $out + ['published' => $e->isPublished(), 'coverImageId' => $e->getCover()?->getId()->toRfc4122()] : $out;
    }

    /** @return array<string, mixed> */
    public static function galleryImage(GalleryImage $g, bool $admin = false): array
    {
        $out = [
            'id' => (string) $g->getId(),
            'url' => self::media('gallery', $g->getFile()),
            'width' => $g->getWidth(),
            'height' => $g->getHeight(),
            'caption' => $g->getCaption(),
            'createdAt' => $g->getCreatedAt()->format(\DATE_ATOM),
        ];

        return $admin ? $out + ['eventId' => $g->getEvent()?->getId()->toRfc4122()] : $out;
    }

    /** @return array<string, mixed> */
    public static function joinRequest(JoinRequest $j): array
    {
        return [
            'id' => (string) $j->getId(),
            'pseudo' => $j->getPseudo(),
            'email' => $j->getEmail(),
            'discord' => $j->getDiscord(),
            'message' => $j->getMessage(),
            'branches' => Branch::toValues($j->getBranches()),
            'status' => $j->getStatus()->value,
            'createdAt' => $j->getCreatedAt()->format(\DATE_ATOM),
            'decidedAt' => $j->getDecidedAt()?->format(\DATE_ATOM),
        ];
    }

    /** @return array<string, mixed> */
    public static function resource(Resource $r, bool $admin = false): array
    {
        $url = 'api/member/resources/'.$r->getId().'/file';
        $out = [
            'id' => (string) $r->getId(),
            'title' => $r->getTitle(),
            'description' => $r->getDescription(),
            'category' => $r->getCategory()->value,
            'format' => strtoupper(pathinfo($r->getDownloadName(), \PATHINFO_EXTENSION)),
            'size' => $r->getSize(),
            'downloadUrl' => $url,
            'previewUrl' => \in_array($r->getMimeType(), ResourceStorage::PREVIEWABLE, true) ? $url.'?inline=1' : null,
        ];

        return $admin ? $out + ['position' => $r->getPosition(), 'published' => $r->isPublished()] : $out;
    }

    /** URL relative (sans / initial, comme tous les appels du front) d'une image servie par MediaController. */
    public static function media(string $folder, ?string $file): ?string
    {
        return null === $file ? null : 'api/media/'.$folder.'/'.rawurlencode($file);
    }
}

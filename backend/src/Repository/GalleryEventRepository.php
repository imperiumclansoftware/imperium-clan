<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\GalleryEvent;
use App\Entity\GalleryImage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/** @extends ServiceEntityRepository<GalleryEvent> */
class GalleryEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GalleryEvent::class);
    }

    /** @return list<GalleryEvent> plus récents d'abord */
    public function findOrdered(bool $publishedOnly): array
    {
        $qb = $this->createQueryBuilder('e')->orderBy('e.date', 'DESC')->addOrderBy('e.id', 'DESC')->setMaxResults(500);
        if ($publishedOnly) {
            $qb->andWhere('e.published = true');
        }

        return Paginator::all($qb, GalleryEvent::class);
    }

    public function findPublishedBySlug(string $slug): ?GalleryEvent
    {
        return $this->findOneBy(['slug' => $slug, 'published' => true]);
    }

    /**
     * Nombre d'images par événement (une requête groupée).
     *
     * @return array<string, int> identifiant d'événement => nombre d'images
     */
    public function imageCounts(): array
    {
        $rows = $this->getEntityManager()->createQueryBuilder()
            ->select('IDENTITY(g.event) AS event', 'COUNT(g.id) AS total')
            ->from(GalleryImage::class, 'g')
            ->andWhere('g.event IS NOT NULL')
            ->groupBy('g.event')
            ->getQuery()
            ->getArrayResult();

        $counts = [];
        foreach ($rows as $row) {
            if (\is_array($row) && \is_scalar($row['event'] ?? null) && is_numeric($row['total'] ?? null)) {
                // Binaire (SQLite) ou texte (PostgreSQL) selon la plateforme : on normalise en RFC 4122.
                $counts[Uuid::fromString((string) $row['event'])->toRfc4122()] = (int) $row['total'];
            }
        }

        return $counts;
    }

    /** Couverture : celle choisie, sinon la première image envoyée dans l'événement. */
    public function coverOf(GalleryEvent $event): ?GalleryImage
    {
        return $event->getCover() ?? $this->getEntityManager()->getRepository(GalleryImage::class)->findOneBy(['event' => $event], ['id' => 'ASC']);
    }
}

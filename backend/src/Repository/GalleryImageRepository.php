<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\GalleryEvent;
use App\Entity\GalleryImage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/** @extends ServiceEntityRepository<GalleryImage> */
class GalleryImageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GalleryImage::class);
    }

    /**
     * Administration : toutes les images, ou celles d'un événement, ou celles hors événement.
     *
     * @return list<GalleryImage>
     */
    public function findForAdmin(?GalleryEvent $event, bool $unassignedOnly, int $page, int $size): array
    {
        $qb = $this->createQueryBuilder('g')->orderBy('g.id', 'DESC');
        if (null !== $event) {
            $qb->andWhere('g.event = :event')->setParameter('event', $event->getId(), 'uuid');
        } elseif ($unassignedOnly) {
            $qb->andWhere('g.event IS NULL');
        }

        return Paginator::page($qb, GalleryImage::class, $page, $size, 200);
    }

    /**
     * Public : images hors événement (les images d'événements se consultent par événement).
     *
     * @return list<GalleryImage>
     */
    public function findUnassignedPage(int $page, int $size): array
    {
        $qb = $this->createQueryBuilder('g')->andWhere('g.event IS NULL')->orderBy('g.id', 'DESC');

        return Paginator::page($qb, GalleryImage::class, $page, $size);
    }

    /** @return list<GalleryImage> images d'un événement, dans l'ordre d'envoi */
    public function findByEvent(GalleryEvent $event): array
    {
        $qb = $this->createQueryBuilder('g')
            ->andWhere('g.event = :event')
            ->setParameter('event', $event->getId(), 'uuid')
            ->orderBy('g.id', 'ASC')
            ->setMaxResults(500);

        return Paginator::all($qb, GalleryImage::class);
    }

    /** Fichier servi au public : image hors événement ou d'un événement publié (filtre en SQL). */
    public function isPublicFile(string $file): bool
    {
        return null !== $this->createQueryBuilder('g')
            ->select('g.id')
            ->leftJoin('g.event', 'e')
            ->andWhere('g.file = :file')
            ->andWhere('g.event IS NULL OR e.published = true')
            ->setParameter('file', $file)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @param list<string> $ids
     *
     * @return list<GalleryImage>
     */
    public function findByIds(array $ids): array
    {
        if ([] === $ids) {
            return [];
        }

        // findBy convertit chaque identifiant avec le type de la colonne (UUID) : pas de valeur brute en SQL.
        return $this->findBy(['id' => array_map(Uuid::fromString(...), $ids)]);
    }
}

<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\JoinRequest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<JoinRequest> */
class JoinRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, JoinRequest::class);
    }

    /** @return list<JoinRequest> */
    public function findPage(int $page, int $size): array
    {
        return Paginator::page($this->createQueryBuilder('j')->orderBy('j.id', 'DESC'), JoinRequest::class, $page, $size);
    }

    /** Purge RGPD : supprime les candidatures plus anciennes que la date donnée. */
    public function deleteOlderThan(\DateTimeImmutable $limit): int
    {
        $deleted = $this->createQueryBuilder('j')
            ->delete()
            ->andWhere('j.createdAt < :limit')
            ->setParameter('limit', $limit)
            ->getQuery()
            ->execute();

        return \is_int($deleted) ? $deleted : 0;
    }
}

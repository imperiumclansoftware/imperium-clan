<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Resource;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<resource> */
class ResourceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Resource::class);
    }

    /** @return list<resource> */
    public function findAllOrdered(bool $publishedOnly): array
    {
        $qb = $this->createQueryBuilder('r')
            ->orderBy('r.category', 'ASC')
            ->addOrderBy('r.position', 'ASC')
            ->addOrderBy('r.title', 'ASC');
        if ($publishedOnly) {
            $qb->andWhere('r.published = true');
        }

        return Paginator::all($qb, Resource::class);
    }
}

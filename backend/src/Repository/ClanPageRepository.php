<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ClanPage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ClanPage> */
class ClanPageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ClanPage::class);
    }

    /** @return list<ClanPage> */
    public function findAllOrdered(bool $publishedOnly): array
    {
        $qb = $this->createQueryBuilder('p')->orderBy('p.position', 'ASC');
        if ($publishedOnly) {
            $qb->andWhere('p.published = true');
        }

        return Paginator::all($qb, ClanPage::class);
    }
}

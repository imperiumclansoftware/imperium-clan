<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Tool;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Tool> */
class ToolRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Tool::class);
    }

    /** @return list<Tool> */
    public function findAllOrdered(bool $publishedOnly): array
    {
        $qb = $this->createQueryBuilder('t')->orderBy('t.position', 'ASC')->addOrderBy('t.name', 'ASC');
        if ($publishedOnly) {
            $qb->andWhere('t.published = true');
        }

        return Paginator::all($qb, Tool::class);
    }
}

<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Member;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Member> */
class MemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Member::class);
    }

    /** @return list<Member> */
    public function findAllOrdered(): array
    {
        $members = Paginator::all($this->createQueryBuilder('m')->orderBy('LOWER(m.pseudo)', 'ASC'), Member::class);
        // Par grade du règlement (Empereur d'abord), puis par pseudo : tri stable sur la liste déjà alphabétique.
        usort($members, static fn (Member $a, Member $b): int => $a->getRank()->order() <=> $b->getRank()->order());

        return $members;
    }
}

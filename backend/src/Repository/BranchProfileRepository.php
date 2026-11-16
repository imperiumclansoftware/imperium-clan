<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BranchProfile;
use App\Enum\Branch;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<BranchProfile> */
class BranchProfileRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BranchProfile::class);
    }

    /**
     * Les quatre branches dans l'ordre officiel ; une branche jamais éditée reçoit sa présentation par défaut
     * (non enregistrée).
     *
     * @return list<BranchProfile>
     */
    public function findAllOrdered(): array
    {
        $saved = [];
        foreach ($this->findAll() as $profile) {
            $saved[$profile->getBranch()->value] = $profile;
        }

        return array_map(static fn (Branch $b): BranchProfile => $saved[$b->value] ?? new BranchProfile($b), Branch::cases());
    }

    public function getOrCreate(Branch $branch): BranchProfile
    {
        $profile = $this->findOneBy(['branch' => $branch]);
        if (null === $profile) {
            $profile = new BranchProfile($branch);
            $this->getEntityManager()->persist($profile);
        }

        return $profile;
    }
}

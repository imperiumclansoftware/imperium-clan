<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\Branch;
use App\Repository\BranchProfileRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Présentation d'une branche (zone /branches/{code}). Texte brut, découpé en paragraphes côté Angular. */
#[ORM\Entity(repositoryClass: BranchProfileRepository::class)]
class BranchProfile
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 300)]
    private string $intro;

    #[ORM\Column(type: Types::TEXT)]
    private string $body = '';

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        #[ORM\Column(length: 3, unique: true, enumType: Branch::class)]
        private Branch $branch,
    ) {
        $this->id = Uuid::v7();
        $this->intro = $branch->defaultIntro();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getBranch(): Branch
    {
        return $this->branch;
    }

    public function getIntro(): string
    {
        return $this->intro;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function update(string $intro, string $body): void
    {
        $this->intro = $intro;
        $this->body = $body;
        $this->updatedAt = new \DateTimeImmutable();
    }
}

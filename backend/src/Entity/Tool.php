<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ToolRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Outil du clan (Conclave, Avenger…) rattaché à une ou plusieurs branches. */
#[ORM\Entity(repositoryClass: ToolRepository::class)]
class Tool
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    public function __construct(
        #[ORM\Column(length: 60)]
        private string $name,
        #[ORM\Column(length: 255)]
        private string $url,
        #[ORM\Column(type: Types::TEXT)]
        private string $description = '',
        #[ORM\Column]
        private int $position = 0,
        #[ORM\Column]
        private bool $published = true,
    ) {
        $this->id = Uuid::v7();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function update(string $name, string $url, string $description, int $position, bool $published): void
    {
        $this->name = $name;
        $this->url = $url;
        $this->description = $description;
        $this->position = $position;
        $this->published = $published;
    }
}

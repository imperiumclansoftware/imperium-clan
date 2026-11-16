<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClanPageRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Section de présentation du clan (histoire, valeurs, règlement…). Le corps est du TEXTE BRUT :
 * le front le découpe en paragraphes, aucun HTML n'est jamais interprété.
 */
#[ORM\Entity(repositoryClass: ClanPageRepository::class)]
class ClanPage
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    public function __construct(
        #[ORM\Column(length: 60, unique: true)]
        private string $slug,
        #[ORM\Column(length: 120)]
        private string $title,
        #[ORM\Column(type: Types::TEXT)]
        private string $body = '',
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

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function update(string $slug, string $title, string $body, int $position, bool $published): void
    {
        $this->slug = $slug;
        $this->title = $title;
        $this->body = $body;
        $this->position = $position;
        $this->published = $published;
    }
}

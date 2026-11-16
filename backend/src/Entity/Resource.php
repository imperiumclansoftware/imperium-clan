<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ResourceCategory;
use App\Repository\ResourceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Fichier téléchargeable par les membres connectés (logos, visuels, modèles pour les réseaux…). */
#[ORM\Entity(repositoryClass: ResourceRepository::class)]
#[ORM\Table(name: 'clan_resource')]
class Resource
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        #[ORM\Column(length: 120)]
        private string $title,
        #[ORM\Column(length: 20, enumType: ResourceCategory::class)]
        private ResourceCategory $category,
        /** Nom de stockage généré (UUID + extension déduite du MIME réel), hors de public/. */
        #[ORM\Column(length: 64)]
        private string $file,
        /** Nom proposé au téléchargement, nettoyé (jamais utilisé comme chemin). */
        #[ORM\Column(length: 120)]
        private string $downloadName,
        #[ORM\Column(length: 80)]
        private string $mimeType,
        #[ORM\Column]
        private int $size,
        #[ORM\Column(type: Types::TEXT)]
        private string $description = '',
        #[ORM\Column]
        private int $position = 0,
        #[ORM\Column]
        private bool $published = true,
    ) {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getCategory(): ResourceCategory
    {
        return $this->category;
    }

    public function getFile(): string
    {
        return $this->file;
    }

    public function getDownloadName(): string
    {
        return $this->downloadName;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function getSize(): int
    {
        return $this->size;
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

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function update(string $title, ResourceCategory $category, string $description, int $position, bool $published): void
    {
        $this->title = $title;
        $this->category = $category;
        $this->description = $description;
        $this->position = $position;
        $this->published = $published;
    }
}

<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\GalleryImageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: GalleryImageRepository::class)]
#[ORM\Index(name: 'idx_gallery_file', columns: ['file'])]
class GalleryImage
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /** Événement de rattachement ; null = image « hors événement ». Supprimer l'événement garde l'image. */
    #[ORM\ManyToOne(targetEntity: GalleryEvent::class)]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?GalleryEvent $event = null;

    public function __construct(
        /** Nom de fichier généré (UUID + extension déduite du MIME réel), stocké hors de public/. */
        #[ORM\Column(length: 64)]
        private string $file,
        #[ORM\Column]
        private int $width,
        #[ORM\Column]
        private int $height,
        #[ORM\Column(length: 200)]
        private string $caption = '',
    ) {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getFile(): string
    {
        return $this->file;
    }

    public function getWidth(): int
    {
        return $this->width;
    }

    public function getHeight(): int
    {
        return $this->height;
    }

    public function getCaption(): string
    {
        return $this->caption;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getEvent(): ?GalleryEvent
    {
        return $this->event;
    }

    public function setEvent(?GalleryEvent $event): void
    {
        $this->event = $event;
    }

    /** Visible du public : hors événement, ou dans un événement publié. */
    public function isPublic(): bool
    {
        return null === $this->event || $this->event->isPublished();
    }

    public function setCaption(string $caption): void
    {
        $this->caption = $caption;
    }
}

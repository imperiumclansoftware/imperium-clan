<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\GalleryEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Événement de la galerie (album) : regroupe des images. Brouillon par défaut : ni l'événement ni ses
 * images ne sont publics tant qu'il n'est pas publié.
 */
#[ORM\Entity(repositoryClass: GalleryEventRepository::class)]
#[ORM\Index(name: 'idx_gallery_event_date', columns: ['event_date'])]
class GalleryEvent
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(type: Types::TEXT)]
    private string $description = '';

    #[ORM\Column]
    private bool $published = false;

    /** Couverture choisie ; sinon la première image de l'événement. */
    #[ORM\ManyToOne(targetEntity: GalleryImage::class)]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?GalleryImage $cover = null;

    public function __construct(
        #[ORM\Column(length: 140, unique: true)]
        private string $slug,
        #[ORM\Column(length: 120)]
        private string $title,
        #[ORM\Column(name: 'event_date', type: Types::DATE_IMMUTABLE)]
        private \DateTimeImmutable $date,
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

    public function getDate(): \DateTimeImmutable
    {
        return $this->date;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function isPublished(): bool
    {
        return $this->published;
    }

    public function getCover(): ?GalleryImage
    {
        return $this->cover;
    }

    public function update(string $title, \DateTimeImmutable $date, string $description, bool $published): void
    {
        $this->title = $title;
        $this->date = $date;
        $this->description = $description;
        $this->published = $published;
    }

    public function setCover(?GalleryImage $cover): void
    {
        $this->cover = $cover;
    }
}

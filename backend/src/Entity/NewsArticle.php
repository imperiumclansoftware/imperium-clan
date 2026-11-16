<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\NewsArticleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Actualité. Brouillon tant que publishedAt est nul ou dans le futur. Corps : JSON de l'éditeur (App\News\RichText). */
#[ORM\Entity(repositoryClass: NewsArticleRepository::class)]
#[ORM\Index(name: 'idx_news_published', columns: ['published_at'])]
#[ORM\Index(name: 'idx_news_cover', columns: ['cover_file'])]
class NewsArticle
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $coverFile = null;

    public function __construct(
        #[ORM\Column(length: 160, unique: true)]
        private string $slug,
        #[ORM\Column(length: 160)]
        private string $title,
        #[ORM\Column(length: 300)]
        private string $excerpt,
        #[ORM\Column(type: Types::TEXT)]
        private string $body,
        /** Auteur affiché, recopié depuis l'utilisateur connecté (jamais lu depuis la requête). */
        #[ORM\Column(length: 80)]
        private string $author,
    ) {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
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

    public function getExcerpt(): string
    {
        return $this->excerpt;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function getAuthor(): string
    {
        return $this->author;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getPublishedAt(): ?\DateTimeImmutable
    {
        return $this->publishedAt;
    }

    public function getCoverFile(): ?string
    {
        return $this->coverFile;
    }

    public function update(string $title, string $excerpt, string $body, ?\DateTimeImmutable $publishedAt): void
    {
        $this->title = $title;
        $this->excerpt = $excerpt;
        $this->body = $body;
        $this->publishedAt = $publishedAt;
    }

    public function setCoverFile(?string $coverFile): void
    {
        $this->coverFile = $coverFile;
    }
}

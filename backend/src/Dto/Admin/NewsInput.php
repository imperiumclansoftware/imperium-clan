<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Dto\BranchList;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class NewsInput
{
    /**
     * @param array<mixed> $content
     * @param list<string> $branches
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 160)]
        public string $title,
        #[Assert\NotBlank]
        #[Assert\Length(max: 300)]
        public string $excerpt,
        /** Document de l'éditeur (JSON ProseMirror/Tiptap), nettoyé par App\News\RichText. */
        #[Assert\NotBlank(message: 'Écris le texte de l’actualité.')]
        public array $content,
        #[Assert\Unique]
        #[Assert\All([new Assert\Choice(choices: BranchList::VALUES)])]
        public array $branches = [],
        /** Date de publication ISO 8601 ; null = brouillon. */
        #[Assert\DateTime(format: \DATE_ATOM)]
        public ?string $publishedAt = null,
    ) {
    }

    public function publishedAtDate(): ?\DateTimeImmutable
    {
        if (null === $this->publishedAt) {
            return null;
        }
        $date = \DateTimeImmutable::createFromFormat(\DATE_ATOM, $this->publishedAt);

        return false === $date ? null : $date;
    }
}

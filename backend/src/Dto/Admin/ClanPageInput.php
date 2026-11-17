<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ClanPageInput
{
    /** @param array<mixed> $content */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 60)]
        #[Assert\Regex('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', message: 'Minuscules, chiffres et tirets uniquement.')]
        public string $slug,
        #[Assert\NotBlank]
        #[Assert\Length(max: 120)]
        public string $title,
        /** Document de l'éditeur (JSON ProseMirror/Tiptap), nettoyé par App\News\RichText. */
        public array $content = [],
        #[Assert\Range(min: 0, max: 1000)]
        public int $position = 0,
        public bool $published = true,
    ) {
    }
}

<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class BranchProfileInput
{
    /** @param array<mixed> $content */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 300)]
        public string $intro,
        /** Document de l'éditeur (JSON ProseMirror/Tiptap), nettoyé par App\News\RichText. */
        public array $content = [],
    ) {
    }
}

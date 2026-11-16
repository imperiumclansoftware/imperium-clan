<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ResourceInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 120)]
        public string $title,
        #[Assert\Choice(choices: ['graphics', 'social'])]
        public string $category = 'graphics',
        #[Assert\Length(max: 1000)]
        public string $description = '',
        #[Assert\Range(min: 0, max: 1000)]
        public int $position = 0,
        public bool $published = true,
    ) {
    }
}

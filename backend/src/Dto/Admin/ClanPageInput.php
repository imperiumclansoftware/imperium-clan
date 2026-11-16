<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ClanPageInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 60)]
        #[Assert\Regex('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', message: 'Minuscules, chiffres et tirets uniquement.')]
        public string $slug,
        #[Assert\NotBlank]
        #[Assert\Length(max: 120)]
        public string $title,
        #[Assert\Length(max: 20000)]
        public string $body = '',
        #[Assert\Range(min: 0, max: 1000)]
        public int $position = 0,
        public bool $published = true,
    ) {
    }
}

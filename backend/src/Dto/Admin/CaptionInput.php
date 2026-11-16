<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CaptionInput
{
    public function __construct(
        #[Assert\Length(max: 200)]
        public string $caption = '',
    ) {
    }
}

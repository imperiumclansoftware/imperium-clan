<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class BranchProfileInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 300)]
        public string $intro,
        #[Assert\Length(max: 20000)]
        public string $body = '',
    ) {
    }
}

<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class JoinRequestDecisionInput
{
    public function __construct(
        #[Assert\Choice(choices: ['new', 'accepted', 'rejected'])]
        public string $status,
    ) {
    }
}

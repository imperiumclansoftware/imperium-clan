<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Enum\ClanRank;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class MemberRankInput
{
    public function __construct(
        #[Assert\NotNull(message: 'Choisis un grade.')]
        public ?ClanRank $rank = null,
    ) {
    }
}

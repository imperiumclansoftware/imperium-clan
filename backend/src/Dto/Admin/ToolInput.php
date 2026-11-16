<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Dto\BranchList;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class ToolInput
{
    /** @param list<string> $branches */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 60)]
        public string $name,
        #[Assert\NotBlank]
        #[Assert\Length(max: 255)]
        #[Assert\Url(protocols: ['https'], requireTld: true)]
        public string $url,
        #[Assert\Length(max: 1000)]
        public string $description = '',
        #[Assert\Count(min: 1, max: 4, minMessage: 'Choisis au moins une branche.')]
        #[Assert\Unique]
        #[Assert\All([new Assert\Choice(choices: BranchList::VALUES)])]
        public array $branches = [],
        #[Assert\Range(min: 0, max: 1000)]
        public int $position = 0,
        public bool $published = true,
    ) {
    }
}

<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use Symfony\Component\Validator\Constraints as Assert;

/** Déplacement groupé d'images vers un événement (ou hors événement si `event` est null). */
final readonly class MoveImagesInput
{
    /** @param list<string> $ids */
    public function __construct(
        #[Assert\Count(min: 1, max: 200)]
        #[Assert\All([new Assert\Uuid()])]
        public array $ids,
        #[Assert\Uuid]
        public ?string $event = null,
    ) {
    }
}

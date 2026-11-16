<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Dto\BranchList;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class GalleryEventInput
{
    /** @param list<string> $branches */
    public function __construct(
        #[Assert\NotBlank(message: 'Donne un titre à l’événement.')]
        #[Assert\Length(max: 120)]
        public string $title,
        #[Assert\NotBlank]
        #[Assert\Date(message: 'Date invalide.')]
        public string $date,
        #[Assert\Length(max: 5000)]
        public string $description = '',
        #[Assert\Unique]
        #[Assert\All([new Assert\Choice(choices: BranchList::VALUES)])]
        public array $branches = [],
        public bool $published = false,
        /** Image de couverture : doit appartenir à l'événement (vérifié par le contrôleur). */
        #[Assert\Uuid]
        public ?string $coverImageId = null,
    ) {
    }

    public function dateValue(): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $this->date);

        return false === $date ? new \DateTimeImmutable('today') : $date;
    }
}

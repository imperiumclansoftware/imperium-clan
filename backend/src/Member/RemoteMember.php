<?php

declare(strict_types=1);

namespace App\Member;

use App\Enum\Branch;

/** Membre tel qu'exporté par Conclave, déjà nettoyé (longueurs bornées, branches connues seulement). */
final readonly class RemoteMember
{
    /** @param list<Branch> $branches */
    public function __construct(
        public string $sub,
        public string $pseudo,
        public ?string $title,
        public ?string $bio,
        public array $branches,
        public ?string $avatarUrl,
    ) {
    }
}

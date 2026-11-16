<?php

declare(strict_types=1);

namespace App\Dto\Public;

use App\Dto\BranchList;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class JoinRequestInput
{
    /** @param list<string> $branches */
    public function __construct(
        #[Assert\NotBlank(message: 'Indique ton pseudo.')]
        #[Assert\Length(min: 2, max: 40)]
        public string $pseudo,
        #[Assert\NotBlank(message: 'Indique ton adresse e-mail.')]
        #[Assert\Email(mode: Assert\Email::VALIDATION_MODE_STRICT)]
        #[Assert\Length(max: 180)]
        public string $email,
        #[Assert\NotBlank(message: 'Présente-toi en quelques mots.')]
        #[Assert\Length(min: 20, max: 3000)]
        public string $message,
        #[Assert\Count(min: 1, max: 4, minMessage: 'Choisis au moins une branche.')]
        #[Assert\Unique]
        #[Assert\All([new Assert\Choice(choices: BranchList::VALUES)])]
        public array $branches = [],
        #[Assert\Length(max: 40)]
        public ?string $discord = null,
        #[Assert\IsTrue(message: 'Tu dois accepter le traitement de ta candidature.')]
        public bool $consent = false,
        /** Pot de miel anti-robot : champ caché qui doit rester vide. */
        public string $website = '',
    ) {
    }
}

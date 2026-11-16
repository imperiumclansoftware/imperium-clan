<?php

declare(strict_types=1);

namespace App\Dto\Public;

use Symfony\Component\Validator\Constraints as Assert;

/** Création du premier administrateur (page /installation). */
final readonly class SetupInput
{
    public function __construct(
        #[Assert\NotBlank(message: 'Colle le jeton d’installation affiché dans les logs du conteneur.')]
        #[Assert\Length(max: 200)]
        public string $token,
        #[Assert\NotBlank(message: 'Indique ton adresse e-mail.')]
        #[Assert\Email(mode: Assert\Email::VALIDATION_MODE_STRICT)]
        #[Assert\Length(max: 180)]
        public string $email,
        #[Assert\NotBlank(message: 'Indique ton nom affiché.')]
        #[Assert\Length(max: 80)]
        public string $displayName,
        #[Assert\NotBlank(message: 'Choisis un mot de passe.')]
        #[Assert\Length(min: 12, max: 4096, minMessage: 'Au moins 12 caractères.')]
        #[Assert\PasswordStrength(message: 'Mot de passe trop faible : allonge-le ou varie les caractères.')]
        #[Assert\NotCompromisedPassword(message: 'Ce mot de passe figure dans des fuites connues, choisis-en un autre.', skipOnError: true)]
        public string $password,
    ) {
    }
}

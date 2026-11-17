<?php

declare(strict_types=1);

namespace App\Security;

/** Membre authentifié par Conclave (revendications vérifiées du jeton d'identité). */
final readonly class ConclaveIdentity
{
    /** @param list<string> $branches blasons Conclave (players, cinephiles, communicants, developers) */
    public function __construct(
        public string $sub,
        public string $name,
        public array $branches,
    ) {
    }

    /** Branche Communication (blason « communicants ») : publie les actualités pour toutes les branches. */
    public function isCommunication(): bool
    {
        return \in_array('communicants', $this->branches, true);
    }
}

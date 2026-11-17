<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Grades du règlement du clan, du plus haut au plus bas. Attribués dans l'administration du portail
 * (jamais par la synchronisation Conclave). Un seul Empereur à la fois.
 */
enum ClanRank: string
{
    case Emperor = 'empereur';
    case Officer = 'officier';
    case Sponsor = 'parrain';
    case Member = 'membre';

    public function label(): string
    {
        return match ($this) {
            self::Emperor => 'Empereur',
            self::Officer => 'Officier',
            self::Sponsor => 'Parrain',
            self::Member => 'Membre',
        };
    }

    /** Ordre d'affichage : 0 pour l'Empereur. */
    public function order(): int
    {
        return (int) array_search($this, self::cases(), true);
    }
}

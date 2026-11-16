<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\Branch;

final class BranchList
{
    /** Valeurs acceptées dans les DTO (contrainte Choice). */
    public const array VALUES = ['ICG', 'ICF', 'ICC', 'ICS'];

    /**
     * @param list<string> $values déjà validées par Assert\Choice
     *
     * @return list<Branch>
     */
    public static function parse(array $values): array
    {
        return Branch::fromValues($values);
    }
}

<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\Branch;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/** Liste de branches stockée en JSON (valeurs ICG, ICF, ICC, ICS), toujours normalisée. */
trait BranchesTrait
{
    /** @var list<string> */
    #[ORM\Column(type: Types::JSON)]
    private array $branches = [];

    /** @return list<Branch> */
    public function getBranches(): array
    {
        return Branch::fromValues($this->branches);
    }

    /** @param iterable<Branch> $branches */
    public function setBranches(iterable $branches): void
    {
        $this->branches = Branch::toValues(Branch::normalize($branches));
    }
}

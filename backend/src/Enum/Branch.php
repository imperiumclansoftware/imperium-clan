<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Les quatre branches du clan (charte imperium_design). Un membre peut en avoir plusieurs :
 * on stocke toujours une liste, jamais une branche unique.
 */
enum Branch: string
{
    case ICG = 'ICG';
    case ICF = 'ICF';
    case ICC = 'ICC';
    case ICS = 'ICS';

    public function label(): string
    {
        return match ($this) {
            self::ICG => 'Imperium Clan Gaming',
            self::ICF => 'Imperium Clan FanDom',
            self::ICC => 'Imperium Clan Communication',
            self::ICS => 'Imperium Clan Software',
        };
    }

    /** Nom court de la charte (« ICG · Gaming »). */
    public function shortName(): string
    {
        return match ($this) {
            self::ICG => 'Gaming',
            self::ICF => 'FanDom',
            self::ICC => 'Communication',
            self::ICS => 'Software',
        };
    }

    /** Accroche par défaut de la zone de la branche, tant qu'un admin ne l'a pas réécrite. */
    public function defaultIntro(): string
    {
        return match ($this) {
            self::ICG => 'Jouer ensemble, en compétition comme pour le plaisir.',
            self::ICF => 'Regarder, partager et débattre : films, séries, univers.',
            self::ICC => 'Raconter le clan : news, visuels et réseaux.',
            self::ICS => 'Coder les outils du clan, en open source.',
        };
    }

    /** Blason Conclave (BranchCrest) correspondant, utilisé par la synchronisation des membres. */
    public static function fromConclaveCrest(string $crest): ?self
    {
        return match ($crest) {
            'players' => self::ICG,
            'cinephiles' => self::ICF,
            'communicants' => self::ICC,
            'developers' => self::ICS,
            default => null,
        };
    }

    /**
     * Normalise une liste reçue (dédoublonnée, ordre officiel ICG, ICF, ICC, ICS).
     *
     * @param iterable<self> $branches
     *
     * @return list<self>
     */
    public static function normalize(iterable $branches): array
    {
        $set = [];
        foreach ($branches as $branch) {
            $set[$branch->value] = true;
        }

        return array_values(array_filter(self::cases(), static fn (self $b): bool => isset($set[$b->value])));
    }

    /**
     * @param list<self> $branches
     *
     * @return list<string>
     */
    public static function toValues(array $branches): array
    {
        return array_map(static fn (self $b): string => $b->value, $branches);
    }

    /**
     * @param array<mixed> $values
     *
     * @return list<self>
     */
    public static function fromValues(array $values): array
    {
        $branches = [];
        foreach ($values as $value) {
            if (\is_string($value) && null !== ($b = self::tryFrom($value))) {
                $branches[] = $b;
            }
        }

        return self::normalize($branches);
    }
}

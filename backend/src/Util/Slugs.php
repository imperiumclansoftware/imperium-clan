<?php

declare(strict_types=1);

namespace App\Util;

use Symfony\Component\String\Slugger\AsciiSlugger;

final class Slugs
{
    /**
     * Identifiant d'URL lisible et unique (« soiree-jeux-2026 », suffixe aléatoire en cas de doublon).
     *
     * @param callable(string): bool $exists
     */
    public static function unique(string $text, callable $exists, string $fallback = 'element', int $max = 140): string
    {
        $base = mb_substr((new AsciiSlugger('fr'))->slug($text)->lower()->toString(), 0, $max) ?: $fallback;
        $slug = $base;
        while ($exists($slug)) {
            $slug = $base.'-'.bin2hex(random_bytes(3));
        }

        return $slug;
    }
}

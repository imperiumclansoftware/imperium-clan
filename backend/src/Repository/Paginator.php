<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\ORM\QueryBuilder;

/** Pagination plafonnée : la taille demandée par le client n'est jamais utilisée telle quelle. */
final class Paginator
{
    public const int MAX_PAGE_SIZE = 50;

    /**
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return list<T>
     */
    public static function page(QueryBuilder $qb, string $class, int $page, int $size, int $max = self::MAX_PAGE_SIZE): array
    {
        $size = max(1, min($size, $max, 100));
        $page = max(1, min($page, 10_000));

        return self::all($qb->setFirstResult(($page - 1) * $size)->setMaxResults($size), $class);
    }

    /**
     * Résultat typé d'une requête (sans annotation @var qui masquerait une erreur de type).
     *
     * @template T of object
     *
     * @param class-string<T> $class
     *
     * @return list<T>
     */
    public static function all(QueryBuilder $qb, string $class): array
    {
        $rows = [];
        foreach ((array) $qb->getQuery()->getResult() as $row) {
            if ($row instanceof $class) {
                $rows[] = $row;
            }
        }

        return $rows;
    }
}

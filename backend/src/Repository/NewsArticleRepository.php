<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\NewsArticle;
use App\Enum\Branch;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<NewsArticle> */
class NewsArticleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NewsArticle::class);
    }

    /**
     * Actualités visibles du public : publiées et dont la date est passée (filtre en SQL).
     *
     * @return list<NewsArticle>
     */
    public function findPublishedPage(int $page, int $size, int $max = Paginator::MAX_PAGE_SIZE): array
    {
        $qb = $this->createQueryBuilder('n')
            ->andWhere('n.publishedAt IS NOT NULL AND n.publishedAt <= :now')
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('n.publishedAt', 'DESC');

        return Paginator::page($qb, NewsArticle::class, $page, $size, $max);
    }

    /**
     * Dernières actualités publiées d'une branche. Les branches sont une liste JSON : le filtre se fait
     * en PHP sur une fenêtre bornée des 100 dernières publications (pas de donnée sensible en jeu).
     *
     * @return list<NewsArticle>
     */
    public function findPublishedForBranch(Branch $branch, int $limit): array
    {
        $matching = array_filter(
            $this->findPublishedPage(1, 100, max: 100),
            static fn (NewsArticle $n): bool => \in_array($branch, $n->getBranches(), true),
        );

        return \array_slice(array_values($matching), 0, max(1, min($limit, Paginator::MAX_PAGE_SIZE)));
    }

    public function findPublishedBySlug(string $slug): ?NewsArticle
    {
        $article = $this->createQueryBuilder('n')
            ->andWhere('n.slug = :slug')
            ->andWhere('n.publishedAt IS NOT NULL AND n.publishedAt <= :now')
            ->setParameter('slug', $slug)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getOneOrNullResult();

        return $article instanceof NewsArticle ? $article : null;
    }

    public function isPublishedCover(string $file): bool
    {
        return null !== $this->createQueryBuilder('n')
            ->select('n.id')
            ->andWhere('n.coverFile = :file')
            ->andWhere('n.publishedAt IS NOT NULL AND n.publishedAt <= :now')
            ->setParameter('file', $file)
            ->setParameter('now', new \DateTimeImmutable())
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** @return list<NewsArticle> */
    public function findAdminPage(int $page, int $size): array
    {
        $qb = $this->createQueryBuilder('n')->orderBy('n.id', 'DESC');

        return Paginator::page($qb, NewsArticle::class, $page, $size);
    }
}

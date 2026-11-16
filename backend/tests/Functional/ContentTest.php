<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\NewsArticle;
use App\Entity\Tool;
use App\Enum\Branch;

final class ContentTest extends ApiTestCase
{
    public function testDraftAndFutureNewsAreHidden(): void
    {
        $published = new NewsArticle('publiee', 'Publiée', 'Résumé', 'Corps', 'Auteur');
        $published->update('Publiée', 'Résumé', 'Corps', new \DateTimeImmutable('-1 hour'));
        $draft = new NewsArticle('brouillon', 'Brouillon', 'Résumé', 'Corps', 'Auteur');
        $future = new NewsArticle('future', 'Future', 'Résumé', 'Corps', 'Auteur');
        $future->update('Future', 'Résumé', 'Corps', new \DateTimeImmutable('+1 day'));
        foreach ([$published, $draft, $future] as $n) {
            $this->em->persist($n);
        }
        $this->em->flush();

        $this->client->request('GET', '/api/public/news');
        $items = (array) $this->json()['items'];
        self::assertCount(1, $items);

        $this->client->request('GET', '/api/public/news/publiee');
        self::assertResponseIsSuccessful();
        $this->client->request('GET', '/api/public/news/brouillon');
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/api/public/news/future');
        self::assertResponseStatusCodeSame(404);
    }

    public function testUnpublishedToolIsHidden(): void
    {
        $visible = new Tool('Conclave', 'https://www.imperiumclan.fr');
        $hidden = new Tool('Caché', 'https://cache.example.test', published: false);
        $this->em->persist($visible);
        $this->em->persist($hidden);
        $this->em->flush();

        $this->client->request('GET', '/api/public/tools');
        $names = array_column((array) $this->json()['items'], 'name');
        self::assertSame(['Conclave'], $names);
    }

    public function testToolBranchesAreValidatedAndNormalized(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN'));

        $this->send('POST', '/api/admin/tools', ['name' => 'Avenger', 'url' => 'https://avenger.imperiumclan.fr', 'branches' => []]);
        self::assertResponseStatusCodeSame(422);
        $this->send('POST', '/api/admin/tools', ['name' => 'Avenger', 'url' => 'https://avenger.imperiumclan.fr', 'branches' => ['XYZ']]);
        self::assertResponseStatusCodeSame(422);
        $this->send('POST', '/api/admin/tools', ['name' => 'Avenger', 'url' => 'javascript:alert(1)', 'branches' => ['ICS']]);
        self::assertResponseStatusCodeSame(422);

        $this->send('POST', '/api/admin/tools', ['name' => 'Avenger', 'url' => 'https://avenger.imperiumclan.fr', 'branches' => ['ICS', 'ICG']]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['ICG', 'ICS'], $this->json()['branches']);
    }

    public function testNewsAuthorComesFromSessionNotPayload(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR'));

        $this->send('POST', '/api/admin/news', ['title' => 'Grande soirée', 'excerpt' => 'Résumé', 'content' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Corps']]]]], 'author' => 'Usurpateur', 'branches' => [Branch::ICG->value]]);

        self::assertResponseStatusCodeSame(201);
        $news = $this->json();
        self::assertSame('Quelqu’un', $news['author']);
        self::assertSame('grande-soiree', $news['slug']);
        self::assertNull($news['publishedAt']);
    }

    public function testDuplicatePageSlugIsRejected(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN'));

        $this->send('POST', '/api/admin/pages', ['slug' => 'histoire', 'title' => 'Histoire']);
        self::assertResponseStatusCodeSame(201);
        $this->send('POST', '/api/admin/pages', ['slug' => 'histoire', 'title' => 'Autre']);
        self::assertResponseStatusCodeSame(409);
        $this->send('POST', '/api/admin/pages', ['slug' => '../etc', 'title' => 'Autre']);
        self::assertResponseStatusCodeSame(422);
    }

    public function testMediaIsOnlyServedWhenAttachedToPublicContent(): void
    {
        $this->client->request('GET', '/api/media/gallery/0193a0c8-0000-4000-8000-000000000000.jpg');
        self::assertResponseStatusCodeSame(404);

        $this->client->request('GET', '/api/media/gallery/..%2F..%2F.env');
        self::assertResponseStatusCodeSame(404);
    }

    public function testNewsContentIsSanitizedAndRequired(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR'));
        $empty = ['type' => 'doc', 'content' => [['type' => 'paragraph']]];
        $this->send('POST', '/api/admin/news', ['title' => 'Vide', 'excerpt' => 'Résumé', 'content' => $empty]);
        self::assertResponseStatusCodeSame(422);

        $evil = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
            ['type' => 'text', 'text' => 'clic', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]],
        ]]]];
        $this->send('POST', '/api/admin/news', ['title' => 'Piège', 'excerpt' => 'Résumé', 'content' => $evil]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'clic']]]]], $this->json()['content']);
    }

    public function testLegacyPlainTextNewsIsServedAsDocument(): void
    {
        $article = new NewsArticle('ancienne', 'Ancienne', 'Résumé', "Ligne 1\n\nLigne 2", 'Auteur');
        $article->update('Ancienne', 'Résumé', "Ligne 1\n\nLigne 2", new \DateTimeImmutable('-1 day'));
        $this->em->persist($article);
        $this->em->flush();

        $this->client->request('GET', '/api/public/news/ancienne');
        $content = (array) $this->json()['content'];
        self::assertSame('doc', $content['type']);
        self::assertCount(2, (array) $content['content']);
    }

    public function testDuplicateTitlesGetValidLowercaseSlugs(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR'));
        $content = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Corps']]]]];
        $now = (new \DateTimeImmutable('-1 minute'))->format(\DATE_ATOM);
        $slugs = [];
        foreach ([1, 2] as $i) {
            $this->send('POST', '/api/admin/news', ['title' => 'Soirée jeux', 'excerpt' => 'Résumé', 'content' => $content, 'publishedAt' => $now]);
            self::assertResponseStatusCodeSame(201);
            $slug = $this->json()['slug'];
            self::assertIsString($slug);
            $slugs[] = $slug;
        }

        self::assertNotSame($slugs[0], $slugs[1]);
        self::assertMatchesRegularExpression('/^[a-z0-9-]+$/', $slugs[1]);
        $this->client->request('GET', '/api/public/news/'.$slugs[1]);
        self::assertResponseIsSuccessful();
    }
}

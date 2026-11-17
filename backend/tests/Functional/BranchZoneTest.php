<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\NewsArticle;
use App\Enum\Branch;

final class BranchZoneTest extends ApiTestCase
{
    public function testBranchesHaveDefaultsInOfficialOrder(): void
    {
        $this->client->request('GET', '/api/public/branches');

        self::assertResponseIsSuccessful();
        $items = (array) $this->json()['items'];
        self::assertSame(['ICG', 'ICF', 'ICC', 'ICS'], array_column($items, 'code'));
        self::assertSame('Imperium Clan FanDom', ((array) $items[1])['name']);
    }

    public function testOnlyAdminsEditBranchProfiles(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));
        $this->send('PUT', '/api/admin/branches/ICG', ['intro' => 'Nouvelle accroche']);
        self::assertResponseStatusCodeSame(403);

        $this->client->loginUser($this->user('ROLE_ADMIN', 'admin@example.test'));
        $this->send('PUT', '/api/admin/branches/ICG', ['intro' => '']);
        self::assertResponseStatusCodeSame(422);
        $this->send('PUT', '/api/admin/branches/XYZ', ['intro' => 'x']);
        self::assertResponseStatusCodeSame(404);
        $this->send('PUT', '/api/admin/branches/ICG', ['intro' => 'Nouvelle accroche', 'content' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Texte']]]]]]);
        self::assertResponseIsSuccessful();

        $this->client->request('GET', '/api/public/branches');
        self::assertSame('Nouvelle accroche', ((array) ((array) $this->json()['items'])[0])['intro']);
    }

    public function testNewsCanBeFilteredByBranch(): void
    {
        $gaming = new NewsArticle('tournoi', 'Tournoi', 'Résumé', 'Corps', 'Auteur');
        $gaming->update('Tournoi', 'Résumé', 'Corps', new \DateTimeImmutable('-1 hour'));
        $gaming->setBranches([Branch::ICG, Branch::ICS]);
        $cine = new NewsArticle('cine', 'Ciné-club', 'Résumé', 'Corps', 'Auteur');
        $cine->update('Ciné-club', 'Résumé', 'Corps', new \DateTimeImmutable('-2 hours'));
        $cine->setBranches([Branch::ICF]);
        $draft = new NewsArticle('brouillon', 'Brouillon', 'Résumé', 'Corps', 'Auteur');
        $draft->setBranches([Branch::ICG]);
        foreach ([$gaming, $cine, $draft] as $n) {
            $this->em->persist($n);
        }
        $this->em->flush();

        $this->client->request('GET', '/api/public/news?branch=ICG');
        self::assertSame(['tournoi'], array_column((array) $this->json()['items'], 'slug'));

        $this->client->request('GET', '/api/public/news?branch=nope');
        self::assertResponseStatusCodeSame(400);
    }
}

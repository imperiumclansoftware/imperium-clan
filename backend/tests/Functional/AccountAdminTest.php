<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;

/** Administration des comptes : les administrateurs sont désignés dans le portail (ADR 0003). */
final class AccountAdminTest extends ApiTestCase
{
    public function testAdminDesignatesAnotherAdmin(): void
    {
        $admin = $this->user('ROLE_ADMIN', 'admin@example.test');
        $member = User::fromConclave('subLyra', 'Lyra');
        $member->setRoles(['ROLE_MEMBER', 'ROLE_EDITOR']);
        $this->em->persist($member);
        $this->em->flush();
        $this->client->loginUser($admin);

        $this->client->request('GET', '/api/admin/accounts');
        self::assertResponseIsSuccessful();
        $lyra = array_values(array_filter($this->items(), static fn (array $a): bool => 'Lyra' === $a['displayName']))[0];
        self::assertTrue($lyra['conclave']);
        self::assertNull($lyra['email']);
        self::assertTrue($lyra['editor']);
        self::assertFalse($lyra['admin']);

        $this->send('PUT', '/api/admin/accounts/'.$member->getId().'/admin', ['admin' => true]);
        self::assertResponseIsSuccessful();
        self::assertTrue($this->json()['admin']);

        $this->send('PUT', '/api/admin/accounts/'.$member->getId().'/admin', ['admin' => false]);
        self::assertResponseIsSuccessful();
        self::assertFalse($this->json()['admin']);
        $this->em->clear();
        $reloaded = $this->em->getRepository(User::class)->find($member->getId());
        self::assertNotNull($reloaded);
        self::assertContains('ROLE_EDITOR', $reloaded->getRoles(), 'les autres rôles restent');
    }

    public function testCannotRemoveOwnAdminRoleNorTheLastAdmin(): void
    {
        $admin = $this->user('ROLE_ADMIN', 'admin@example.test');
        $this->client->loginUser($admin);

        $this->send('PUT', '/api/admin/accounts/'.$admin->getId().'/admin', ['admin' => false]);
        self::assertResponseStatusCodeSame(409);

        $other = $this->user('ROLE_ADMIN', 'autre@example.test');
        $this->send('PUT', '/api/admin/accounts/'.$other->getId().'/admin', ['admin' => false]);
        self::assertResponseIsSuccessful(); // il reste l'administrateur connecté
    }

    public function testEditorsCannotManageAccounts(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));

        $this->client->request('GET', '/api/admin/accounts');

        self::assertResponseStatusCodeSame(403);
    }

    /** @return list<array<mixed>> */
    private function items(): array
    {
        $items = $this->json()['items'] ?? [];
        \assert(\is_array($items));

        return array_values(array_filter($items, 'is_array'));
    }
}

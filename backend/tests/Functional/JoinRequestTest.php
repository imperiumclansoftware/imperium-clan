<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\JoinRequest;

final class JoinRequestTest extends ApiTestCase
{
    private const array VALID = [
        'pseudo' => 'Nouvelle recrue',
        'email' => 'Recrue@Example.test',
        'message' => 'Je joue tous les soirs et j’aimerais rejoindre le clan.',
        'branches' => ['ICG', 'ICF'],
        'consent' => true,
    ];

    public function testValidRequestIsStored(): void
    {
        $this->send('POST', '/api/public/join-requests', self::VALID);

        self::assertResponseStatusCodeSame(202);
        $stored = $this->em->getRepository(JoinRequest::class)->findAll();
        self::assertCount(1, $stored);
        self::assertSame('recrue@example.test', $stored[0]->getEmail());
    }

    public function testConsentAndBranchesAreRequired(): void
    {
        $this->send('POST', '/api/public/join-requests', ['consent' => false] + self::VALID);
        self::assertResponseStatusCodeSame(422);

        $this->send('POST', '/api/public/join-requests', ['branches' => []] + self::VALID);
        self::assertResponseStatusCodeSame(422);
    }

    public function testHoneypotIsSilentlyIgnored(): void
    {
        $this->send('POST', '/api/public/join-requests', ['website' => 'https://spam.example'] + self::VALID);

        self::assertResponseStatusCodeSame(202);
        self::assertCount(0, $this->em->getRepository(JoinRequest::class)->findAll());
    }

    public function testRateLimited(): void
    {
        $this->send('POST', '/api/public/join-requests', self::VALID);
        $this->send('POST', '/api/public/join-requests', self::VALID);
        $this->send('POST', '/api/public/join-requests', self::VALID);

        self::assertResponseStatusCodeSame(429);
    }

    public function testOnlyAdminsReadRequests(): void
    {
        $this->send('POST', '/api/public/join-requests', self::VALID);
        $this->client->loginUser($this->user('ROLE_EDITOR'));
        $this->client->request('GET', '/api/admin/join-requests');

        self::assertResponseStatusCodeSame(403);
    }
}

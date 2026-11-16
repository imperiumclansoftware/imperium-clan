<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Setup\SetupState;

final class SetupTest extends ApiTestCase
{
    private const array VALID = [
        'email' => 'empereur@example.test',
        'displayName' => 'L’Empereur',
        'password' => 'Une-Phrase-De-Passe-Solide-2026!',
    ];

    private function setupState(): SetupState
    {
        $state = self::getContainer()->get(SetupState::class);
        \assert($state instanceof SetupState);

        return $state;
    }

    public function testFreshInstanceRequiresSetup(): void
    {
        $this->client->request('GET', '/api/setup');

        self::assertResponseIsSuccessful();
        self::assertSame(['required' => true], $this->json());
    }

    public function testValidTokenCreatesAdminAndLogsIn(): void
    {
        $token = $this->setupState()->issueToken();

        $this->send('POST', '/api/setup', ['token' => $token] + self::VALID);

        self::assertResponseStatusCodeSame(201);
        $users = $this->em->getRepository(User::class)->findAll();
        self::assertCount(1, $users);
        self::assertContains('ROLE_ADMIN', $users[0]->getRoles());
        self::assertNotSame(self::VALID['password'], $users[0]->getPassword());

        // Session ouverte : l'administrateur est connecté.
        $this->client->request('GET', '/api/me');
        self::assertResponseIsSuccessful();
        self::assertSame('empereur@example.test', $this->json()['email']);

        // Jeton consommé, installation close.
        self::assertFalse($this->setupState()->tokenMatches($token));
        $this->client->request('GET', '/api/setup');
        self::assertSame(['required' => false], $this->json());
    }

    public function testWrongTokenIsRejected(): void
    {
        $this->setupState()->issueToken();

        $this->send('POST', '/api/setup', ['token' => 'nope'] + self::VALID);

        self::assertResponseStatusCodeSame(403);
        self::assertCount(0, $this->em->getRepository(User::class)->findAll());
    }

    public function testNoTokenIssuedMeansNoSetup(): void
    {
        $this->setupState()->clearToken();

        $this->send('POST', '/api/setup', ['token' => str_repeat('a', 64)] + self::VALID);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSetupIsClosedOnceAUserExists(): void
    {
        $token = $this->setupState()->issueToken();
        $this->user('ROLE_MEMBER');

        $this->send('POST', '/api/setup', ['token' => $token] + self::VALID);

        self::assertResponseStatusCodeSame(409);
        self::assertCount(1, $this->em->getRepository(User::class)->findAll());
    }

    public function testWeakPasswordIsRejected(): void
    {
        $token = $this->setupState()->issueToken();

        $this->send('POST', '/api/setup', ['token' => $token, 'password' => 'court'] + self::VALID);

        self::assertResponseStatusCodeSame(422);
    }

    public function testTokenGuessingIsRateLimited(): void
    {
        $this->setupState()->issueToken();
        for ($i = 0; $i < 6; ++$i) {
            $this->send('POST', '/api/setup', ['token' => 'essai-'.$i] + self::VALID);
        }

        self::assertResponseStatusCodeSame(429);
    }

    public function testCsrfHeaderIsRequired(): void
    {
        $token = $this->setupState()->issueToken();

        $this->client->jsonRequest('POST', '/api/setup', ['token' => $token] + self::VALID);

        self::assertResponseStatusCodeSame(403);
        self::assertCount(0, $this->em->getRepository(User::class)->findAll());
    }
}

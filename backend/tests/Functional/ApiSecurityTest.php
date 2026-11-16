<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\EventSubscriber\CsrfDoubleSubmitSubscriber;

final class ApiSecurityTest extends ApiTestCase
{
    public function testSecurityHeadersAndCsrfCookie(): void
    {
        $this->client->request('GET', '/api/health');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('X-Content-Type-Options', 'nosniff');
        self::assertResponseHeaderSame('X-Frame-Options', 'DENY');
        self::assertResponseHasHeader('Content-Security-Policy');
        self::assertResponseHasCookie(CsrfDoubleSubmitSubscriber::COOKIE);
    }

    public function testPublicApiIsOpen(): void
    {
        foreach (['members', 'tools', 'pages', 'news', 'gallery'] as $resource) {
            $this->client->request('GET', '/api/public/'.$resource);
            self::assertResponseIsSuccessful($resource);
        }
    }

    public function testAdminRequiresAuthentication(): void
    {
        $this->client->request('GET', '/api/admin/tools');

        self::assertResponseStatusCodeSame(401);
    }

    public function testUnsafeRequestWithoutCsrfHeaderIsRejected(): void
    {
        $this->client->jsonRequest('POST', '/api/login', ['email' => 'a@example.test', 'password' => 'x']);

        self::assertResponseStatusCodeSame(403);
    }

    public function testLoginWithBadCredentialsReturnsGeneric401(): void
    {
        $this->send('POST', '/api/login', ['email' => 'unknown@example.test', 'password' => 'x']);

        self::assertResponseStatusCodeSame(401);
    }

    public function testEditorIsLimitedToNewsAndGallery(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR'));

        $this->client->request('GET', '/api/admin/news');
        self::assertResponseIsSuccessful();
        $this->client->request('GET', '/api/admin/gallery');
        self::assertResponseIsSuccessful();

        foreach (['tools', 'pages', 'members', 'join-requests'] as $resource) {
            $this->client->request('GET', '/api/admin/'.$resource);
            self::assertResponseStatusCodeSame(403, $resource);
        }
    }

    public function testAdminInheritsEditor(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN'));

        $this->client->request('GET', '/api/admin/news');
        self::assertResponseIsSuccessful();
        $this->client->request('GET', '/api/admin/join-requests');
        self::assertResponseIsSuccessful();
    }

    public function testMeExposesDisplayNameAndRoles(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN'));
        $this->client->request('GET', '/api/me');

        self::assertResponseIsSuccessful();
        $me = $this->json();
        self::assertSame('Quelqu’un', $me['displayName']);
        self::assertContains('ROLE_ADMIN', (array) $me['roles']);
    }
}

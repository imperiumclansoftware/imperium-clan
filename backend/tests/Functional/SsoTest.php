<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\Security\ConclaveSso;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * « Se connecter avec Conclave » (ADR 0003), contre un faux Conclave : clé RSA de test, JWKS et
 * /oauth/token simulés (le défi PKCE est vérifié comme le ferait Conclave).
 */
final class SsoTest extends ApiTestCase
{
    private const string ISSUER = 'https://conclave.test';
    private const string CLIENT = 'cc_portail';

    private \OpenSSLAsymmetricKey $key;
    /** @var array<string, mixed> revendications du prochain jeton d'identité (surcharges) */
    private array $claims = [];
    private ?\OpenSSLAsymmetricKey $signWith = null;
    private string $challenge = '';

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => \OPENSSL_KEYTYPE_RSA]);
        self::assertNotFalse($key);
        $this->key = $key;
        // Même conteneur pour toutes les requêtes du test : le faux Conclave reste en place
        $this->client->disableReboot();
        self::getContainer()->set(ConclaveSso::class, new ConclaveSso(new MockHttpClient($this->conclave(...)), self::ISSUER.'/', self::CLIENT, 'secret'));
    }

    public function testCommunicationMemberSignsInAndCanPublishNews(): void
    {
        $this->client->request('GET', '/api/session');
        self::assertTrue($this->json()['conclave']);

        $this->signIn(['sub' => 'subLyra', 'name' => 'Lyra', 'branches' => ['communicants', 'cinephiles']], '/admin/actualites');

        self::assertResponseRedirects('http://localhost/admin/actualites');
        $this->client->request('GET', '/api/me');
        $me = $this->json();
        self::assertSame('Lyra', $me['displayName']);
        self::assertTrue($me['conclave']);
        self::assertNull($me['email']);
        $roles = $me['roles'];
        self::assertIsArray($roles);
        self::assertContains('ROLE_EDITOR', $roles);
        self::assertNotContains('ROLE_ADMIN', $roles);
        $this->client->request('GET', '/api/admin/news');
        self::assertResponseIsSuccessful();
    }

    public function testOtherMemberGetsTheMemberAreaOnly(): void
    {
        $this->signIn(['sub' => 'subCorvus', 'name' => 'Corvus', 'branches' => ['players']]);

        self::assertResponseRedirects('http://localhost/ressources');
        $this->client->request('GET', '/api/me');
        self::assertSame(['ROLE_MEMBER', 'ROLE_USER'], $this->json()['roles']);
        $this->client->request('GET', '/api/admin/news');
        self::assertResponseStatusCodeSame(403);
    }

    public function testRolesFollowConclaveAtEachSignInButAdminIsKept(): void
    {
        $this->signIn(['sub' => 'subVesta', 'name' => 'Vesta', 'branches' => ['communicants']]);
        $user = $this->em->getRepository(User::class)->findOneBy(['conclaveSub' => 'subVesta']);
        self::assertNotNull($user);
        $user->setRoles([...$user->getRoles(), 'ROLE_ADMIN']); // désignée administratrice dans le portail
        $this->em->flush();

        // Elle a quitté la branche Communication et changé de nom dans Conclave
        $this->client->restart();
        $this->signIn(['sub' => 'subVesta', 'name' => 'Vesta la Grande', 'branches' => ['players']]);

        $this->em->clear();
        $user = $this->em->getRepository(User::class)->findOneBy(['conclaveSub' => 'subVesta']);
        self::assertNotNull($user);
        self::assertSame('Vesta la Grande', $user->getDisplayName());
        self::assertContains('ROLE_ADMIN', $user->getRoles());
        self::assertNotContains('ROLE_EDITOR', array_diff($user->getRoles(), ['ROLE_ADMIN']), 'éditeur retiré avec la branche');
        self::assertNotNull($user->getLastLoginAt());
        self::assertCount(1, $this->em->getRepository(User::class)->findBy(['conclaveSub' => 'subVesta']));
    }

    public function testLocalAccountLinkedToTheMemberKeepsItsManualRoles(): void
    {
        $local = $this->user('ROLE_EDITOR', 'orion@example.test');
        $local->setConclaveSub('subOrion');
        $this->em->flush();

        $this->signIn(['sub' => 'subOrion', 'name' => 'Orion', 'branches' => ['developers']]);

        $this->em->clear();
        $user = $this->em->getRepository(User::class)->findOneBy(['conclaveSub' => 'subOrion']);
        self::assertNotNull($user);
        self::assertSame('orion@example.test', $user->getEmail());
        self::assertContains('ROLE_EDITOR', $user->getRoles());
    }

    /** @return iterable<string, array{array<string, mixed>}> */
    public static function forgedTokens(): iterable
    {
        yield 'autre émetteur' => [['iss' => 'https://evil.example']];
        yield 'autre audience' => [['aud' => 'cc_autre']];
        yield 'expiré' => [['exp' => time() - 3600]];
        yield 'nonce rejoué' => [['nonce' => 'ancien']];
        yield 'sub invalide' => [['sub' => '../../etc']];
    }

    /**
     * @param array<string, mixed> $claims
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('forgedTokens')]
    public function testForgedIdTokenIsRefused(array $claims): void
    {
        $this->signIn($claims + ['sub' => 'subNyx', 'name' => 'Nyx']);

        $this->assertRefused();
    }

    public function testSignatureByAnotherKeyIsRefused(): void
    {
        $other = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => \OPENSSL_KEYTYPE_RSA]);
        self::assertNotFalse($other);
        $this->signWith = $other;

        $this->signIn(['sub' => 'subNyx', 'name' => 'Nyx']);

        $this->assertRefused();
    }

    public function testStateFromAnotherBrowserIsRefused(): void
    {
        $this->client->request('GET', '/api/auth/conclave');
        $this->client->request('GET', '/api/auth/conclave/callback?code=abc&state=etat-forge');

        $this->assertRefused();
    }

    public function testCancelledSignInComesBackWithAMessage(): void
    {
        $this->client->request('GET', '/api/auth/conclave');
        $this->client->request('GET', '/api/auth/conclave/callback?error=access_denied&state=x');

        self::assertResponseRedirects();
        self::assertStringContainsString('annul', urldecode((string) $this->client->getResponse()->headers->get('Location')));
    }

    public function testReturnPathMustBeInternal(): void
    {
        $this->signIn(['sub' => 'subAquila', 'name' => 'Aquila', 'branches' => []], 'https://evil.example/');

        self::assertResponseRedirects('http://localhost/ressources');
    }

    // ---- helpers ----

    /**
     * Parcours complet : départ vers Conclave, puis retour avec un code (le faux Conclave signe un jeton
     * d'identité avec les revendications données).
     *
     * @param array<string, mixed> $claims
     */
    private function signIn(array $claims, ?string $return = null): void
    {
        $this->client->request('GET', '/api/auth/conclave'.(null === $return ? '' : '?retour='.urlencode($return)));
        $location = (string) $this->client->getResponse()->headers->get('Location');
        self::assertStringStartsWith(self::ISSUER.'/oauth/authorize?', $location);
        parse_str((string) parse_url($location, \PHP_URL_QUERY), $query);
        self::assertSame('S256', $query['code_challenge_method']);
        self::assertSame('openid profile', $query['scope']);
        self::assertSame('http://localhost/api/auth/conclave/callback', $query['redirect_uri']);
        $challenge = $query['code_challenge'];
        self::assertIsString($challenge);
        $this->challenge = $challenge;
        $this->claims = $claims + ['nonce' => $query['nonce']];

        $this->client->request('GET', '/api/auth/conclave/callback?'.http_build_query(['code' => 'code-ok', 'state' => $query['state']]));
    }

    private function assertRefused(): void
    {
        self::assertResponseRedirects();
        self::assertStringStartsWith('http://localhost/connexion?erreur=', (string) $this->client->getResponse()->headers->get('Location'));
        $this->client->request('GET', '/api/session');
        self::assertNull($this->json()['user']);
    }

    /** @param array<string, mixed> $options */
    private function conclave(string $method, string $url, array $options): MockResponse
    {
        if (self::ISSUER.'/.well-known/jwks.json' === $url) {
            $details = openssl_pkey_get_details($this->key);
            self::assertIsArray($details);
            $rsa = $details['rsa'] ?? null;
            self::assertIsArray($rsa);
            ['n' => $n, 'e' => $e] = $rsa;
            self::assertIsString($n);
            self::assertIsString($e);

            return new JsonMockResponse(['keys' => [['kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'k1', 'n' => self::b64($n), 'e' => self::b64($e)]]]);
        }
        if (self::ISSUER.'/oauth/token' === $url && 'POST' === $method) {
            parse_str(\is_string($options['body'] ?? null) ? $options['body'] : '', $body);
            // Comme Conclave : vérificateur PKCE et identifiants du client
            $verifier = $body['code_verifier'] ?? '';
            $headers = $options['normalized_headers'] ?? [];
            $authorization = \is_array($headers) ? ($headers['authorization'] ?? []) : [];
            if (!\is_string($verifier) || self::b64(hash('sha256', $verifier, true)) !== $this->challenge
                || 'code-ok' !== ($body['code'] ?? null)
                || !\is_array($authorization) || !\in_array('Authorization: Basic '.base64_encode(self::CLIENT.':secret'), $authorization, true)) {
                return new JsonMockResponse(['error' => 'invalid_grant'], ['http_code' => 400]);
            }
            $now = time();
            $claims = $this->claims + ['iss' => self::ISSUER, 'aud' => self::CLIENT, 'iat' => $now, 'exp' => $now + 300, 'branches' => []];

            return new JsonMockResponse(['access_token' => 'at', 'token_type' => 'Bearer', 'id_token' => $this->jwt($claims)]);
        }

        return new MockResponse('', ['http_code' => 404]);
    }

    /** @param array<string, mixed> $claims */
    private function jwt(array $claims): string
    {
        $input = self::b64((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT', 'kid' => 'k1'])).'.'.self::b64((string) json_encode($claims));
        self::assertTrue(openssl_sign($input, $signature, $this->signWith ?? $this->key, \OPENSSL_ALGO_SHA256));
        self::assertIsString($signature);

        return $input.'.'.self::b64($signature);
    }

    private static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}

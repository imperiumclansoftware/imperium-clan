<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Connexion avec le compte Conclave (ADR 0003) : client OpenID Connect, flux authorization code + PKCE
 * S256. Le state, le nonce et le vérificateur PKCE restent dans la session ; le jeton d'identité est
 * vérifié entièrement (signature RS256 avec la JWKS de Conclave, émetteur, audience, dates, nonce).
 */
final readonly class ConclaveSso
{
    private const string SESSION = 'conclave_sso';
    private const int LEEWAY = 60;

    public function __construct(
        private HttpClientInterface $httpClient,
        #[Autowire('%env(default::CONCLAVE_URL)%')]
        private ?string $baseUrl,
        #[Autowire('%env(default::CONCLAVE_CLIENT_ID)%')]
        private ?string $clientId,
        #[Autowire('%env(default::CONCLAVE_CLIENT_SECRET)%')]
        private ?string $clientSecret,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== (string) $this->baseUrl && '' !== (string) $this->clientId && '' !== (string) $this->clientSecret;
    }

    /** Adresse de Conclave où envoyer le visiteur ; prépare la session pour le retour. */
    public function authorizationUrl(SessionInterface $session, string $redirectUri, ?string $returnPath): string
    {
        $state = self::random();
        $nonce = self::random();
        $verifier = self::random(48);
        $session->set(self::SESSION, ['state' => $state, 'nonce' => $nonce, 'verifier' => $verifier, 'redirect' => $redirectUri, 'return' => $returnPath]);

        return $this->issuer().'/oauth/authorize?'.http_build_query([
            'response_type' => 'code',
            'client_id' => (string) $this->clientId,
            'redirect_uri' => $redirectUri,
            'scope' => 'openid profile',
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => self::b64(hash('sha256', $verifier, true)),
            'code_challenge_method' => 'S256',
        ], '', '&', \PHP_QUERY_RFC3986);
    }

    /**
     * Retour de Conclave : vérifie le state, échange le code, vérifie le jeton d'identité.
     *
     * @return array{claims: ConclaveIdentity, return: ?string}
     *
     * @throws SsoException
     */
    public function complete(SessionInterface $session, string $state, string $code): array
    {
        $pending = $session->get(self::SESSION);
        $session->remove(self::SESSION); // usage unique, quoi qu'il arrive
        $expected = \is_array($pending) ? ($pending['state'] ?? null) : null;
        $nonce = \is_array($pending) ? ($pending['nonce'] ?? null) : null;
        $verifier = \is_array($pending) ? ($pending['verifier'] ?? null) : null;
        $redirect = \is_array($pending) ? ($pending['redirect'] ?? null) : null;
        $return = \is_array($pending) ? ($pending['return'] ?? null) : null;
        if (!\is_string($expected) || !\is_string($nonce) || !\is_string($verifier) || !\is_string($redirect)
            || '' === $state || !hash_equals($expected, $state)) {
            throw new SsoException('La demande de connexion a expiré ou ne vient pas de ce navigateur. Recommence.');
        }
        if ('' === $code) {
            throw new SsoException('Conclave n’a pas renvoyé de code de connexion.');
        }

        try {
            $tokens = $this->httpClient->request('POST', $this->issuer().'/oauth/token', [
                'timeout' => 10,
                'auth_basic' => [(string) $this->clientId, (string) $this->clientSecret],
                'body' => [
                    'grant_type' => 'authorization_code',
                    'code' => $code,
                    'redirect_uri' => $redirect,
                    'code_verifier' => $verifier,
                ],
            ])->toArray();
        } catch (ExceptionInterface $e) {
            throw new SsoException('Conclave a refusé la connexion ou est injoignable.', previous: $e);
        }
        $idToken = $tokens['id_token'] ?? null;
        if (!\is_string($idToken)) {
            throw new SsoException('Conclave n’a pas renvoyé de jeton d’identité.');
        }

        return [
            'claims' => $this->verify($idToken, $nonce),
            'return' => \is_string($return) ? $return : null,
        ];
    }

    /** @throws SsoException */
    public function verify(string $jwt, string $nonce): ConclaveIdentity
    {
        $parts = explode('.', $jwt);
        if (3 !== \count($parts)) {
            throw new SsoException('Jeton d’identité mal formé.');
        }
        [$h, $p, $s] = $parts;
        $header = json_decode((string) Jwk::decode($h), true);
        $claims = json_decode((string) Jwk::decode($p), true);
        $signature = Jwk::decode($s);
        if (!\is_array($header) || !\is_array($claims) || null === $signature || 'RS256' !== ($header['alg'] ?? null)) {
            throw new SsoException('Jeton d’identité mal formé ou algorithme refusé.');
        }
        $pem = $this->publicKey(\is_string($header['kid'] ?? null) ? $header['kid'] : null);
        if (1 !== openssl_verify($h.'.'.$p, $signature, $pem, \OPENSSL_ALGO_SHA256)) {
            throw new SsoException('Signature du jeton d’identité invalide.');
        }

        $now = time();
        $aud = $claims['aud'] ?? null;
        $audiences = \is_array($aud) ? $aud : [$aud];
        if (($claims['iss'] ?? null) !== $this->issuer()
            || !\in_array($this->clientId, $audiences, true)
            || !\is_int($claims['exp'] ?? null) || $claims['exp'] < $now - self::LEEWAY
            || !\is_int($claims['iat'] ?? null) || $claims['iat'] > $now + self::LEEWAY
            || !\is_string($claims['nonce'] ?? null) || '' === $nonce || !hash_equals($nonce, $claims['nonce'])) {
            throw new SsoException('Jeton d’identité refusé (émetteur, audience, date ou nonce).');
        }
        $sub = $claims['sub'] ?? null;
        if (!\is_string($sub) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $sub)) {
            throw new SsoException('Identifiant Conclave invalide.');
        }
        $name = \is_string($claims['name'] ?? null) && '' !== trim($claims['name']) ? mb_substr(trim($claims['name']), 0, 80) : 'Membre';
        $branches = array_values(array_filter((array) ($claims['branches'] ?? []), 'is_string'));

        return new ConclaveIdentity($sub, $name, $branches);
    }

    private function publicKey(?string $kid): string
    {
        try {
            $jwks = $this->httpClient->request('GET', $this->issuer().'/.well-known/jwks.json', ['timeout' => 10])->toArray();
        } catch (ExceptionInterface $e) {
            throw new SsoException('Clés de Conclave injoignables.', previous: $e);
        }
        foreach ((array) ($jwks['keys'] ?? []) as $jwk) {
            if (\is_array($jwk) && (null === $kid || ($jwk['kid'] ?? null) === $kid) && null !== ($pem = Jwk::toPem($jwk))) {
                return $pem;
            }
        }
        throw new SsoException('Clé de signature de Conclave introuvable.');
    }

    /** Émetteur attendu (iss) : l'adresse publique de Conclave, sans / final. */
    private function issuer(): string
    {
        return rtrim((string) $this->baseUrl, '/');
    }

    /** @param int<1, max> $bytes */
    private static function random(int $bytes = 32): string
    {
        return self::b64(random_bytes($bytes));
    }

    private static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}

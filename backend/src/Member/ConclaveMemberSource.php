<?php

declare(strict_types=1);

namespace App\Member;

use App\Enum\Branch;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Lit les membres exportés par Conclave (ADR 0004) :
 * 1. jeton OAuth2 « client credentials », scope portal:members ;
 * 2. GET /api/portal/members.
 * Les avatars ne sont téléchargés QUE depuis l'hôte Conclave (pas de SSRF vers une URL arbitraire).
 */
final readonly class ConclaveMemberSource implements MemberSource
{
    private const int MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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

    public function fetchMembers(): array
    {
        if (!$this->isConfigured()) {
            throw new MemberSyncException('Synchronisation Conclave non configurée (CONCLAVE_URL, CONCLAVE_CLIENT_ID, CONCLAVE_CLIENT_SECRET).');
        }
        try {
            $token = $this->httpClient->request('POST', $this->url('/oauth/token'), [
                'timeout' => 10,
                'auth_basic' => [(string) $this->clientId, (string) $this->clientSecret],
                'body' => ['grant_type' => 'client_credentials', 'scope' => 'portal:members'],
            ])->toArray();
            $accessToken = $token['access_token'] ?? null;
            if (!\is_string($accessToken) || '' === $accessToken) {
                throw new MemberSyncException('Conclave n’a pas délivré de jeton.');
            }
            $data = $this->httpClient->request('GET', $this->url('/api/portal/members'), [
                'timeout' => 20,
                'auth_bearer' => $accessToken,
            ])->toArray();
        } catch (ExceptionInterface $e) {
            throw new MemberSyncException('Conclave est injoignable ou a refusé la demande.', previous: $e);
        }

        $items = $data['items'] ?? null;
        if (!\is_array($items)) {
            throw new MemberSyncException('Réponse de Conclave inattendue.');
        }
        $members = [];
        foreach ($items as $item) {
            if (\is_array($item) && null !== ($member = $this->parse($item))) {
                $members[] = $member;
            }
        }

        return $members;
    }

    public function fetchAvatar(string $url): ?string
    {
        $base = parse_url((string) $this->baseUrl);
        $target = parse_url($url);
        if (!\is_array($base) || !\is_array($target)
            || ($target['scheme'] ?? '') !== ($base['scheme'] ?? '')
            || ($target['host'] ?? '') !== ($base['host'] ?? '')
            || ($target['port'] ?? null) !== ($base['port'] ?? null)) {
            return null;
        }
        try {
            $response = $this->httpClient->request('GET', $url, ['timeout' => 10, 'max_redirects' => 0]);
            if (200 !== $response->getStatusCode()) {
                return null;
            }
            $length = (int) ($response->getHeaders()['content-length'][0] ?? 0);
            if ($length > self::MAX_AVATAR_BYTES) {
                return null;
            }
            $bytes = $response->getContent();
        } catch (ExceptionInterface) {
            return null;
        }

        return \strlen($bytes) <= self::MAX_AVATAR_BYTES ? $bytes : null;
    }

    /** @param array<mixed> $item */
    private function parse(array $item): ?RemoteMember
    {
        $sub = $item['sub'] ?? null;
        $pseudo = $item['pseudo'] ?? null;
        if (!\is_string($sub) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $sub) || !\is_string($pseudo) || '' === trim($pseudo)) {
            return null;
        }
        $branches = [];
        foreach ((array) ($item['branches'] ?? []) as $crest) {
            if (\is_string($crest) && null !== ($b = Branch::fromConclaveCrest($crest) ?? Branch::tryFrom($crest))) {
                $branches[] = $b;
            }
        }
        $text = static fn (mixed $v, int $max): ?string => \is_string($v) && '' !== trim($v) ? mb_substr(trim($v), 0, $max) : null;

        return new RemoteMember(
            $sub,
            mb_substr(trim($pseudo), 0, 40),
            $text($item['title'] ?? null, 60),
            $text($item['bio'] ?? null, 1000),
            Branch::normalize($branches),
            $text($item['avatarUrl'] ?? null, 500),
        );
    }

    private function url(string $path): string
    {
        return rtrim((string) $this->baseUrl, '/').$path;
    }
}

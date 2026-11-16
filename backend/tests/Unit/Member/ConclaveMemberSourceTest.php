<?php

declare(strict_types=1);

namespace App\Tests\Unit\Member;

use App\Enum\Branch;
use App\Member\ConclaveMemberSource;
use App\Member\MemberSyncException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;
use Symfony\Component\HttpClient\Response\MockResponse;

final class ConclaveMemberSourceTest extends TestCase
{
    public function testNotConfigured(): void
    {
        $source = new ConclaveMemberSource(new MockHttpClient(), null, null, null);

        self::assertFalse($source->isConfigured());
        $this->expectException(MemberSyncException::class);
        $source->fetchMembers();
    }

    public function testParsesAndSanitizesMembers(): void
    {
        $client = new MockHttpClient([
            new JsonMockResponse(['access_token' => 'abc']),
            new JsonMockResponse(['items' => [
                ['sub' => 'u-1', 'pseudo' => '  Aquila ', 'branches' => ['developers', 'players', 'inconnue'], 'avatarUrl' => 'https://conclave.test/api/avatars/1'],
                ['sub' => '../bad', 'pseudo' => 'Rejeté'],
                ['sub' => 'u-2', 'pseudo' => ''],
                'pas un tableau',
            ]]),
        ]);
        $source = new ConclaveMemberSource($client, 'https://conclave.test', 'portal', 'secret');

        $members = $source->fetchMembers();

        self::assertCount(1, $members);
        self::assertSame('Aquila', $members[0]->pseudo);
        self::assertSame([Branch::ICG, Branch::ICS], $members[0]->branches);
    }

    public function testAvatarOnlyFromConclaveHost(): void
    {
        $client = new MockHttpClient(static fn (string $method, string $url): MockResponse => new MockResponse('img'));
        $source = new ConclaveMemberSource($client, 'https://conclave.test', 'portal', 'secret');

        self::assertSame('img', $source->fetchAvatar('https://conclave.test/api/avatars/1'));
        self::assertNull($source->fetchAvatar('https://evil.test/avatar.png'));
        self::assertNull($source->fetchAvatar('http://conclave.test/api/avatars/1'));
        self::assertNull($source->fetchAvatar('http://169.254.169.254/latest/meta-data'));
    }
}

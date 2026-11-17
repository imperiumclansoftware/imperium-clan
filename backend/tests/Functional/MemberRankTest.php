<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Member;
use App\Enum\ClanRank;
use App\Member\MemberSource;
use App\Member\MemberSynchronizer;
use App\Member\RemoteMember;

/** Grades du règlement : attribués dans l'administration, affichés et triés sur le portail. */
final class MemberRankTest extends ApiTestCase
{
    public function testDefaultRankIsMemberAndAdminsAssignRanks(): void
    {
        $aquila = $this->member('aquila', 'Aquila');
        $this->member('lyra', 'Lyra');

        $this->client->request('GET', '/api/public/members');
        self::assertSame(['membre', 'membre'], array_column($this->items(), 'rank'));

        $this->client->loginUser($this->user('ROLE_ADMIN', 'admin@example.test'));
        $this->send('PUT', '/api/admin/members/'.$aquila->getId().'/rank', ['rank' => 'officier']);
        self::assertResponseIsSuccessful();
        self::assertSame('officier', $this->json()['rank']);

        $this->send('PUT', '/api/admin/members/'.$aquila->getId().'/rank', ['rank' => 'grand-maitre']);
        self::assertResponseStatusCodeSame(422);
    }

    public function testOnlyOneEmperor(): void
    {
        $aquila = $this->member('aquila', 'Aquila');
        $lyra = $this->member('lyra', 'Lyra');
        $this->client->loginUser($this->user('ROLE_ADMIN', 'admin@example.test'));

        $this->send('PUT', '/api/admin/members/'.$aquila->getId().'/rank', ['rank' => 'empereur']);
        self::assertResponseIsSuccessful();
        $this->send('PUT', '/api/admin/members/'.$lyra->getId().'/rank', ['rank' => 'empereur']);
        self::assertResponseStatusCodeSame(409);
        $detail = $this->json()['detail'] ?? null;
        self::assertIsString($detail);
        self::assertStringContainsString('Aquila', $detail);

        // Le même Empereur peut être réenregistré
        $this->send('PUT', '/api/admin/members/'.$aquila->getId().'/rank', ['rank' => 'empereur']);
        self::assertResponseIsSuccessful();
    }

    public function testMembersAreListedByRank(): void
    {
        $this->member('a', 'Alpha');
        $this->member('b', 'Bravo')->setRank(ClanRank::Sponsor);
        $this->member('c', 'Charlie')->setRank(ClanRank::Emperor);
        $this->member('d', 'Delta')->setRank(ClanRank::Officer);
        $this->em->flush();

        $this->client->request('GET', '/api/public/members');

        self::assertSame(['Charlie', 'Delta', 'Bravo', 'Alpha'], array_column($this->items(), 'pseudo'));
    }

    public function testOnlyAdminsAssignRanks(): void
    {
        $aquila = $this->member('aquila', 'Aquila');
        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));

        $this->send('PUT', '/api/admin/members/'.$aquila->getId().'/rank', ['rank' => 'officier']);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSynchronisationKeepsTheRank(): void
    {
        $this->member('kept', 'Aquila')->setRank(ClanRank::Officer);
        $this->em->flush();
        self::getContainer()->set(MemberSource::class, new class implements MemberSource {
            public function isConfigured(): bool
            {
                return true;
            }

            public function fetchMembers(): array
            {
                return [new RemoteMember('kept', 'Aquila renommé', null, null, [], null)];
            }

            public function fetchAvatar(string $url): ?string
            {
                return null;
            }
        });
        $sync = self::getContainer()->get(MemberSynchronizer::class);
        \assert($sync instanceof MemberSynchronizer);
        $sync->run();

        $this->em->clear();
        $member = $this->em->getRepository(Member::class)->findOneBy(['conclaveSub' => 'kept']);
        self::assertNotNull($member);
        self::assertSame(ClanRank::Officer, $member->getRank());
        self::assertSame('Aquila renommé', $member->getPseudo());
    }

    private function member(string $sub, string $pseudo): Member
    {
        $member = new Member($sub, $pseudo);
        $this->em->persist($member);
        $this->em->flush();

        return $member;
    }

    /** @return list<array<mixed>> */
    private function items(): array
    {
        $items = $this->json()['items'] ?? [];
        \assert(\is_array($items));

        return array_values(array_filter($items, 'is_array'));
    }
}

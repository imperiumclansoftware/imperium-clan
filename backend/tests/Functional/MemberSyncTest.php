<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Member;
use App\Enum\Branch;
use App\Member\MemberSource;
use App\Member\MemberSynchronizer;
use App\Member\RemoteMember;

final class MemberSyncTest extends ApiTestCase
{
    public function testCreatesUpdatesAndRemovesMembers(): void
    {
        $gone = new Member('gone', 'Parti');
        $kept = new Member('kept', 'Ancien pseudo');
        $this->em->persist($gone);
        $this->em->persist($kept);
        $this->em->flush();

        self::getContainer()->set(MemberSource::class, new class implements MemberSource {
            public function isConfigured(): bool
            {
                return true;
            }

            public function fetchMembers(): array
            {
                return [
                    new RemoteMember('kept', 'Nouveau pseudo', null, null, [Branch::ICC], null),
                    new RemoteMember('new', 'Recrue', 'Titre', 'Bio', [Branch::ICG, Branch::ICF], null),
                ];
            }

            public function fetchAvatar(string $url): ?string
            {
                return null;
            }
        });
        $sync = self::getContainer()->get(MemberSynchronizer::class);
        \assert($sync instanceof MemberSynchronizer);

        self::assertSame(['created' => 1, 'updated' => 1, 'removed' => 1], $sync->run());

        $this->em->clear();
        $pseudos = array_map(static fn (Member $m): string => $m->getPseudo(), $this->em->getRepository(Member::class)->findAll());
        sort($pseudos);
        self::assertSame(['Nouveau pseudo', 'Recrue'], $pseudos);
    }
}

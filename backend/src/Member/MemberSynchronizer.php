<?php

declare(strict_types=1);

namespace App\Member;

use App\Entity\Member;
use App\Media\ImageStorage;
use App\Repository\MemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Aligne la copie locale sur l'export Conclave : crée, met à jour, et SUPPRIME les membres absents
 * (retrait du consentement ou départ du clan), avatar compris.
 */
final readonly class MemberSynchronizer
{
    public function __construct(
        private MemberSource $source,
        private MemberRepository $members,
        private ImageStorage $storage,
        private EntityManagerInterface $em,
        private LoggerInterface $logger,
    ) {
    }

    public function isConfigured(): bool
    {
        return $this->source->isConfigured();
    }

    /**
     * @return array{created: int, updated: int, removed: int}
     *
     * @throws MemberSyncException
     */
    public function run(): array
    {
        $remote = $this->source->fetchMembers();
        $existing = [];
        foreach ($this->members->findAll() as $member) {
            $existing[$member->getConclaveSub()] = $member;
        }

        $created = $updated = 0;
        foreach ($remote as $r) {
            $member = $existing[$r->sub] ?? null;
            unset($existing[$r->sub]);
            if (null === $member) {
                $member = new Member($r->sub, $r->pseudo);
                $this->em->persist($member);
                ++$created;
            } else {
                ++$updated;
            }
            $member->updateProfile($r->pseudo, $r->title, $r->bio);
            $member->setBranches($r->branches);
            $this->syncAvatar($member, $r->avatarUrl);
        }

        foreach ($existing as $gone) {
            $this->storage->delete('avatars', $gone->getAvatarFile());
            $this->em->remove($gone);
        }
        $this->em->flush();

        $report = ['created' => $created, 'updated' => $updated, 'removed' => \count($existing)];
        $this->logger->info('Synchronisation des membres terminée.', $report);

        return $report;
    }

    private function syncAvatar(Member $member, ?string $url): void
    {
        if (null === $url) {
            $this->storage->delete('avatars', $member->getAvatarFile());
            $member->setAvatar(null, null);

            return;
        }
        $bytes = $this->source->fetchAvatar($url);
        if (null === $bytes) {
            return; // on garde l'avatar précédent
        }
        $checksum = hash('xxh128', $bytes); // empreinte non sécuritaire : détecte un changement
        if ($checksum === $member->getAvatarChecksum()) {
            return;
        }
        try {
            $file = $this->storage->storeBytes($bytes, 'avatars');
        } catch (\InvalidArgumentException) {
            return;
        }
        $this->storage->delete('avatars', $member->getAvatarFile());
        $member->setAvatar($file, $checksum);
    }
}

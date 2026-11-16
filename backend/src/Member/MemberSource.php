<?php

declare(strict_types=1);

namespace App\Member;

interface MemberSource
{
    public function isConfigured(): bool;

    /**
     * @return list<RemoteMember> membres ayant consenti à apparaître sur le portail
     *
     * @throws MemberSyncException
     */
    public function fetchMembers(): array;

    /** Octets de l'avatar, ou null s'il est introuvable / refusé. */
    public function fetchAvatar(string $url): ?string;
}

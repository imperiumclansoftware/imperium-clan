<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ClanRank;
use App\Repository\MemberRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Copie locale d'un membre ayant consenti à apparaître sur le portail (ADR 0004).
 * Source de vérité : Conclave, sauf le grade du règlement (rank), attribué dans l'administration du portail.
 */
#[ORM\Entity(repositoryClass: MemberRepository::class)]
#[ORM\Index(name: 'idx_member_avatar', columns: ['avatar_file'])]
class Member
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 40)]
    private string $pseudo;

    #[ORM\Column(length: 60, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $bio = null;

    /** Fichier d'avatar dans var/uploads/avatars (nom = UUID), servi par MediaController. */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $avatarFile = null;

    /** Empreinte xxh128 de l'avatar distant, pour ne retélécharger que s'il change (non sécuritaire). */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $avatarChecksum = null;

    #[ORM\Column]
    private \DateTimeImmutable $syncedAt;

    /** Grade du règlement, propre au portail : la synchronisation n'y touche pas. */
    #[ORM\Column(name: 'clan_rank', length: 10, enumType: ClanRank::class, options: ['default' => 'membre'])]
    private ClanRank $rank = ClanRank::Member;

    public function __construct(
        /** Identifiant OIDC opaque fourni par Conclave (`sub`). */
        #[ORM\Column(length: 64, unique: true)]
        private string $conclaveSub,
        string $pseudo,
    ) {
        $this->id = Uuid::v7();
        $this->pseudo = $pseudo;
        $this->syncedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getConclaveSub(): string
    {
        return $this->conclaveSub;
    }

    public function getPseudo(): string
    {
        return $this->pseudo;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function getAvatarFile(): ?string
    {
        return $this->avatarFile;
    }

    public function getAvatarChecksum(): ?string
    {
        return $this->avatarChecksum;
    }

    public function getSyncedAt(): \DateTimeImmutable
    {
        return $this->syncedAt;
    }

    public function updateProfile(string $pseudo, ?string $title, ?string $bio): void
    {
        $this->pseudo = $pseudo;
        $this->title = $title;
        $this->bio = $bio;
        $this->syncedAt = new \DateTimeImmutable();
    }

    public function getRank(): ClanRank
    {
        return $this->rank;
    }

    public function setRank(ClanRank $rank): void
    {
        $this->rank = $rank;
    }

    public function setAvatar(?string $file, ?string $checksum): void
    {
        $this->avatarFile = $file;
        $this->avatarChecksum = $checksum;
    }
}

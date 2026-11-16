<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\JoinRequestStatus;
use App\Repository\JoinRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Candidature envoyée depuis le formulaire « Rejoindre ». Données personnelles :
 * consultables par les admins uniquement, purgées après la durée de conservation (app:join-requests:purge).
 */
#[ORM\Entity(repositoryClass: JoinRequestRepository::class)]
class JoinRequest
{
    use BranchesTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(length: 10, enumType: JoinRequestStatus::class)]
    private JoinRequestStatus $status = JoinRequestStatus::New;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $decidedAt = null;

    public function __construct(
        #[ORM\Column(length: 40)]
        private string $pseudo,
        #[ORM\Column(length: 180)]
        private string $email,
        #[ORM\Column(length: 40, nullable: true)]
        private ?string $discord,
        #[ORM\Column(type: Types::TEXT)]
        private string $message,
    ) {
        $this->id = Uuid::v7();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPseudo(): string
    {
        return $this->pseudo;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getDiscord(): ?string
    {
        return $this->discord;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getStatus(): JoinRequestStatus
    {
        return $this->status;
    }

    public function getDecidedAt(): ?\DateTimeImmutable
    {
        return $this->decidedAt;
    }

    public function decide(JoinRequestStatus $status): void
    {
        $this->status = $status;
        $this->decidedAt = JoinRequestStatus::New === $status ? null : new \DateTimeImmutable();
    }
}

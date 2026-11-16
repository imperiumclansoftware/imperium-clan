<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    /** @var list<string> */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column(nullable: true)]
    private ?string $password = null;

    /**
     * Identifiant Conclave (`sub`) du membre correspondant. Rempli par le SSO (ADR 0003) ; en attendant,
     * par `app:user:create --member=<sub>`. Relie le compte à sa fiche Member (pseudo, branches).
     */
    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $conclaveSub = null;

    public function __construct(
        #[ORM\Column(length: 180, unique: true)]
        private string $email,
        /** Nom affiché publiquement (auteur des actualités). Jamais l'e-mail. */
        #[ORM\Column(length: 80)]
        private string $displayName,
    ) {
        // UUID v7 : ordonné dans le temps, bon pour les index. Ce n'est PAS un contrôle d'accès.
        $this->id = Uuid::v7();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getConclaveSub(): ?string
    {
        return $this->conclaveSub;
    }

    public function setConclaveSub(?string $conclaveSub): void
    {
        $this->conclaveSub = $conclaveSub;
    }

    public function getDisplayName(): string
    {
        return $this->displayName;
    }

    /** @return non-empty-string */
    public function getUserIdentifier(): string
    {
        \assert('' !== $this->email);

        return $this->email;
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        return array_values(array_unique([...$this->roles, 'ROLE_USER']));
    }

    /** @param list<string> $roles */
    public function setRoles(array $roles): void
    {
        $this->roles = $roles;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    /** Reçoit TOUJOURS un hash produit par UserPasswordHasherInterface, jamais un mot de passe en clair. */
    public function setPassword(string $hashedPassword): void
    {
        $this->password = $hashedPassword;
    }
}

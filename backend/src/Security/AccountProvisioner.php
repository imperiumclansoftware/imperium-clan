<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Compte du portail d'un membre connecté avec Conclave (ADR 0003), droits recalculés à CHAQUE connexion :
 * - membre du clan → espace membre (ROLE_MEMBER) ;
 * - branche Communication (blason « communicants ») → actualités pour toutes les branches (ROLE_EDITOR) ;
 * - administrateur : uniquement s'il a été désigné dans le portail (ROLE_ADMIN conservé).
 * Un compte local relié au même membre (--member) garde en plus les rôles qu'on lui a donnés.
 */
final readonly class AccountProvisioner
{
    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $em,
    ) {
    }

    public function provision(ConclaveIdentity $identity): User
    {
        $user = $this->users->findOneBy(['conclaveSub' => $identity->sub]);
        if (null === $user) {
            $user = User::fromConclave($identity->sub, $identity->name);
            $this->em->persist($user);
        } else {
            $user->setDisplayName($identity->name);
        }

        $current = $user->getRoles();
        $roles = ['ROLE_MEMBER'];
        if ($identity->isCommunication()) {
            $roles[] = 'ROLE_EDITOR';
        }
        if (\in_array('ROLE_ADMIN', $current, true)) {
            $roles[] = 'ROLE_ADMIN';
        }
        if (!$user->isConclaveAccount() && \in_array('ROLE_EDITOR', $current, true)) {
            $roles[] = 'ROLE_EDITOR'; // compte local : rôle donné à la main, conservé
        }
        $user->setRoles(array_values(array_unique($roles)));
        $user->markLoggedIn();
        $this->em->flush();

        return $user;
    }
}

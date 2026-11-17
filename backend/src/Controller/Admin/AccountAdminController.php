<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Dto\Admin\AccountAdminInput;
use App\Entity\User;
use App\Repository\MemberRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Comptes du portail : membres connectés avec Conclave et comptes locaux de secours. Les administrateurs
 * sont désignés ici (ADR 0003) ; les autres droits viennent de Conclave à chaque connexion.
 */
#[Route('/api/admin/accounts')]
#[IsGranted('ROLE_ADMIN')]
final class AccountAdminController extends AdminController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly MemberRepository $members,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('', name: 'admin_account_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $accounts = $this->users->findBy([], ['displayName' => 'ASC']);

        return $this->json(['items' => array_map($this->describe(...), $accounts)]);
    }

    #[Route('/{id}/admin', name: 'admin_account_admin', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function setAdmin(User $account, #[MapRequestPayload] AccountAdminInput $input, #[CurrentUser] User $me): JsonResponse
    {
        $isAdmin = \in_array('ROLE_ADMIN', $account->getRoles(), true);
        if (false === $input->admin && $isAdmin) {
            if ($account->getId()->equals($me->getId())) {
                return $this->problem('Tu ne peux pas te retirer toi-même le rôle d’administrateur.', Response::HTTP_CONFLICT);
            }
            if ($this->adminCount() <= 1) {
                return $this->problem('Il faut garder au moins un administrateur.', Response::HTTP_CONFLICT);
            }
        }
        $roles = array_values(array_diff($account->getRoles(), ['ROLE_ADMIN', 'ROLE_USER']));
        if (true === $input->admin) {
            $roles[] = 'ROLE_ADMIN';
        }
        $account->setRoles($roles);
        $this->em->flush();

        return $this->json($this->describe($account));
    }

    private function adminCount(): int
    {
        return \count(array_filter($this->users->findAll(), static fn (User $u): bool => \in_array('ROLE_ADMIN', $u->getRoles(), true)));
    }

    /** @return array<string, mixed> */
    private function describe(User $u): array
    {
        $sub = $u->getConclaveSub();
        $member = null === $sub ? null : $this->members->findOneBy(['conclaveSub' => $sub]);
        $roles = $u->getRoles();

        return [
            'id' => (string) $u->getId(),
            'displayName' => $u->getDisplayName(),
            'email' => $u->getEmail(),
            'conclave' => $u->isConclaveAccount(),
            'linked' => null !== $sub,
            'avatarUrl' => null === $member || null === $member->getAvatarFile() ? null : 'api/media/avatars/'.rawurlencode($member->getAvatarFile()),
            'admin' => \in_array('ROLE_ADMIN', $roles, true),
            'editor' => \in_array('ROLE_EDITOR', $roles, true) || \in_array('ROLE_ADMIN', $roles, true),
            'lastLoginAt' => $u->getLastLoginAt()?->format(\DATE_ATOM),
        ];
    }
}

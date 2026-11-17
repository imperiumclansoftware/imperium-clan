<?php

declare(strict_types=1);

namespace App\Controller;

use App\Api\Presenter;
use App\Entity\User;
use App\Repository\MemberRepository;
use App\Security\ConclaveSso;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

final class AuthController extends AbstractController
{
    public function __construct(private readonly MemberRepository $members)
    {
    }

    /** Le firewall json_login authentifie avant d'arriver ici ; un échec renvoie un 401 générique. */
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(#[CurrentUser] ?User $user, EntityManagerInterface $em): JsonResponse
    {
        if (null === $user) {
            return $this->json(['error' => 'Invalid credentials.'], 401);
        }
        $user->markLoggedIn();
        $em->flush();

        return $this->me($user);
    }

    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function me(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json($this->describe($user));
    }

    /**
     * Session courante, accessible à tous : `user` vaut null pour un visiteur (pas de 401 au démarrage
     * de l'application). Première requête du front, elle pose aussi le cookie XSRF-TOKEN.
     */
    #[Route('/api/session', name: 'api_session', methods: ['GET'])]
    public function session(#[CurrentUser] ?User $user, ConclaveSso $sso): JsonResponse
    {
        return $this->json([
            'user' => null === $user ? null : $this->describe($user),
            // Bouton « Se connecter avec Conclave » sur la page de connexion
            'conclave' => $sso->isConfigured(),
        ]);
    }

    /** @return array<string, mixed> */
    private function describe(User $user): array
    {
        $sub = $user->getConclaveSub();
        $member = null === $sub ? null : $this->members->findOneBy(['conclaveSub' => $sub]);

        return [
            'id' => (string) $user->getId(),
            'email' => $user->getEmail(),
            'displayName' => $user->getDisplayName(),
            'conclave' => $user->isConclaveAccount(),
            'roles' => $user->getRoles(),
            'member' => null === $member ? null : Presenter::member($member),
        ];
    }

    #[Route('/api/logout', name: 'api_logout', methods: ['POST'])]
    public function logout(): never
    {
        throw new \LogicException('Intercepté par le firewall.');
    }

    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json(['status' => 'ok']);
    }
}

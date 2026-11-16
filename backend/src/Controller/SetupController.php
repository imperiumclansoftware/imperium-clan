<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Public\SetupInput;
use App\Entity\User;
use App\Setup\SetupState;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Installation : création du premier administrateur depuis le navigateur. Ne fonctionne que tant
 * qu'aucun compte n'existe, et exige le jeton d'installation (SetupState).
 */
#[Route('/api/setup')]
final class SetupController extends AbstractController
{
    public function __construct(private readonly SetupState $setup)
    {
    }

    #[Route('', name: 'api_setup_status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        return $this->json(['required' => $this->setup->isRequired()]);
    }

    #[Route('', name: 'api_setup', methods: ['POST'])]
    public function install(
        Request $request,
        #[MapRequestPayload] SetupInput $input,
        RateLimiterFactoryInterface $setupLimiter,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        Security $security,
        LoggerInterface $logger,
    ): JsonResponse {
        if (!$setupLimiter->create((string) $request->getClientIp())->consume()->isAccepted()) {
            return $this->json(['detail' => 'Trop de tentatives, réessaie dans quelques minutes.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $user = $this->setup->exclusively(function () use ($input, $hasher, $em, $logger): User|JsonResponse {
            // Contrôle refait sous verrou : l'installation n'a lieu qu'une fois.
            if (!$this->setup->isRequired()) {
                return $this->json(['detail' => 'Ce site est déjà installé.'], Response::HTTP_CONFLICT);
            }
            if (!$this->setup->tokenMatches($input->token)) {
                $logger->warning('Installation refusée : jeton invalide.');

                return $this->json(['detail' => 'Jeton d’installation invalide.'], Response::HTTP_FORBIDDEN);
            }

            $user = new User(trim($input->email), trim($input->displayName));
            $user->setRoles(['ROLE_ADMIN']);
            $user->setPassword($hasher->hashPassword($user, $input->password));
            $em->persist($user);
            $em->flush();
            $this->setup->clearToken();
            $logger->notice('Installation terminée : premier administrateur créé.');

            return $user;
        });
        if ($user instanceof JsonResponse) {
            return $user;
        }

        // Connexion immédiate : l'administrateur arrive directement dans l'administration.
        $security->login($user, 'json_login', 'main');

        return $this->json(['status' => 'installed'], Response::HTTP_CREATED);
    }
}

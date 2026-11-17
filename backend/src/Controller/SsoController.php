<?php

declare(strict_types=1);

namespace App\Controller;

use App\Security\AccountProvisioner;
use App\Security\ConclaveSso;
use App\Security\SsoException;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * « Se connecter avec Conclave » (ADR 0003) : aller vers Conclave, puis retour avec le code. Navigation
 * complète du navigateur (pas d'appel XHR) ; les erreurs reviennent sur la page /connexion.
 */
#[Route('/api/auth/conclave')]
final class SsoController extends AbstractController
{
    public function __construct(
        private readonly ConclaveSso $sso,
        #[Autowire('%env(default::APP_URL)%')]
        private readonly ?string $appUrl = null,
    ) {
    }

    #[Route('', name: 'auth_conclave', methods: ['GET'])]
    public function start(Request $request): RedirectResponse
    {
        if (!$this->sso->isConfigured()) {
            return $this->failure($request, 'La connexion avec Conclave n’est pas configurée sur ce portail.');
        }
        $return = self::safeReturn($request->query->getString('retour'));

        return new RedirectResponse($this->sso->authorizationUrl($request->getSession(), $this->callbackUrl($request), $return));
    }

    #[Route('/callback', name: 'auth_conclave_callback', methods: ['GET'])]
    public function callback(Request $request, AccountProvisioner $accounts, Security $security, LoggerInterface $logger): RedirectResponse
    {
        if ('' !== $request->query->getString('error')) {
            $request->getSession()->remove('conclave_sso');

            return $this->failure($request, 'access_denied' === $request->query->getString('error')
                ? 'Connexion annulée depuis Conclave.'
                : 'Conclave a refusé la connexion.');
        }
        try {
            $result = $this->sso->complete($request->getSession(), $request->query->getString('state'), $request->query->getString('code'));
        } catch (SsoException $e) {
            $logger->warning('Connexion Conclave refusée : {reason}', ['reason' => $e->getMessage()]);

            return $this->failure($request, $e->getMessage());
        }

        $user = $accounts->provision($result['claims']);
        $security->login($user, 'json_login', 'main');

        $target = $result['return'] ?? (\in_array('ROLE_EDITOR', $user->getRoles(), true) ? '/admin' : '/ressources');

        return new RedirectResponse($this->base($request).$target);
    }

    private function failure(Request $request, string $message): RedirectResponse
    {
        return new RedirectResponse($this->base($request).'/connexion?'.http_build_query(['erreur' => $message]));
    }

    /** Adresse de retour enregistrée chez Conclave : APP_URL, sinon l'adresse de la requête. */
    private function callbackUrl(Request $request): string
    {
        return $this->base($request).'/api/auth/conclave/callback';
    }

    private function base(Request $request): string
    {
        return rtrim($this->appUrl ?: $request->getSchemeAndHttpHost(), '/');
    }

    /** Chemin interne uniquement (pas de redirection ouverte). */
    private static function safeReturn(string $value): ?string
    {
        return str_starts_with($value, '/') && !str_starts_with($value, '//') && !str_contains($value, '\\') ? $value : null;
    }
}

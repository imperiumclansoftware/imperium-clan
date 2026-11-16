<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Protection CSRF « double submit » compatible avec le XSRF natif d'Angular (HttpClient) :
 * - pose un cookie XSRF-TOKEN aléatoire (lisible par JS, SameSite=Strict) ;
 * - exige l'en-tête X-XSRF-TOKEN identique sur toute requête /api non sûre, login compris.
 * Complète le cookie de session SameSite=Lax.
 */
final class CsrfDoubleSubmitSubscriber implements EventSubscriberInterface
{
    public const string COOKIE = 'XSRF-TOKEN';
    public const string HEADER = 'X-XSRF-TOKEN';
    private const array SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    public static function getSubscribedEvents(): array
    {
        return [
            // Avant le firewall (priorité 8) pour protéger aussi /api/login.
            KernelEvents::REQUEST => ['onRequest', 16],
            KernelEvents::RESPONSE => ['onResponse', 0],
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest()
            || \in_array($request->getMethod(), self::SAFE_METHODS, true)
            || !str_starts_with($request->getPathInfo(), '/api/')) {
            return;
        }

        $cookie = (string) $request->cookies->get(self::COOKIE, '');
        $header = (string) $request->headers->get(self::HEADER, '');

        if ('' === $cookie || '' === $header || !hash_equals($cookie, $header)) {
            $event->setResponse(new JsonResponse(['error' => 'Invalid CSRF token.'], 403));
        }
    }

    public function onResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest() || $request->cookies->has(self::COOKIE)) {
            return;
        }

        $event->getResponse()->headers->setCookie(
            Cookie::create(self::COOKIE, bin2hex(random_bytes(32)))
                ->withSecure($request->isSecure())
                ->withHttpOnly(false) // Angular doit pouvoir le lire
                ->withSameSite(Cookie::SAMESITE_STRICT)
                ->withPath('/'),
        );
    }
}

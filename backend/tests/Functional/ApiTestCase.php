<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use App\EventSubscriber\CsrfDoubleSubmitSubscriber;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\BrowserKit\Cookie;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;
    protected EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $em = self::getContainer()->get(EntityManagerInterface::class);
        \assert($em instanceof EntityManagerInterface);
        $this->em = $em;

        $schemaTool = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $schemaTool->dropSchema($metadata);
        $schemaTool->createSchema($metadata);

        // L'état des limiteurs de débit (cache fichier) ne doit pas fuiter d'un test à l'autre.
        $limiterCache = self::getContainer()->get('cache.rate_limiter');
        \assert($limiterCache instanceof CacheItemPoolInterface);
        $limiterCache->clear();
    }

    protected function user(string $role, string $email = 'someone@example.test'): User
    {
        $user = new User($email, 'Quelqu’un');
        $user->setRoles([$role]);
        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }

    /** @param array<mixed> $payload */
    protected function send(string $method, string $uri, array $payload = []): void
    {
        // Jeton déjà posé par une réponse précédente : on le réutilise (deux cookies XSRF se contrediraient)
        $token = null;
        foreach ($this->client->getCookieJar()->all() as $cookie) {
            if (CsrfDoubleSubmitSubscriber::COOKIE === $cookie->getName()) {
                $token = $cookie->getValue();
            }
        }
        if (null === $token) {
            $token = 'tok';
            $this->client->getCookieJar()->set(new Cookie(CsrfDoubleSubmitSubscriber::COOKIE, $token));
        }
        $this->client->jsonRequest($method, $uri, $payload, ['HTTP_X_XSRF_TOKEN' => $token]);
    }

    /** @return array<mixed> */
    protected function json(): array
    {
        $data = json_decode((string) $this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        \assert(\is_array($data));

        return $data;
    }
}

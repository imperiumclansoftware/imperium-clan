<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

final class CreateUserCommandTest extends ApiTestCase
{
    public function testWithoutPasswordFailsWithAClearMessage(): void
    {
        $tester = $this->tester();

        $status = $tester->execute(['email' => 'chef@example.test', 'name' => 'Chef'], ['interactive' => false]);

        self::assertSame(Command::FAILURE, $status);
        self::assertStringContainsString('Mot de passe requis', $tester->getDisplay());
        self::assertCount(0, $this->em->getRepository(User::class)->findAll());
    }

    public function testCreatesAnEditorWithAHashedPassword(): void
    {
        $tester = $this->tester();
        $tester->setInputs(['Une-Phrase-De-Passe-Solide-2026!']);

        $tester->execute(['email' => 'editeur@example.test', 'name' => 'Éditeur', '--role' => 'editor']);

        $tester->assertCommandIsSuccessful();
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => 'editeur@example.test']);
        self::assertNotNull($user);
        self::assertContains('ROLE_EDITOR', $user->getRoles());
        self::assertNotSame('Une-Phrase-De-Passe-Solide-2026!', $user->getPassword());
    }

    private function tester(): CommandTester
    {
        $kernel = self::$kernel;
        self::assertNotNull($kernel);

        return new CommandTester((new Application($kernel))->find('app:user:create'));
    }
}

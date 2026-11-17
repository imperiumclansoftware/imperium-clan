<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[AsCommand(name: 'app:user:create', description: 'Crée un compte local (mot de passe saisi en masqué, haché en Argon2id). En attendant le SSO Conclave, puis en secours.')]
final class CreateUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly ValidatorInterface $validator,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('email', InputArgument::REQUIRED);
        $this->addArgument('name', InputArgument::REQUIRED, 'Nom affiché (auteur des actualités)');
        $this->addOption('role', null, InputOption::VALUE_REQUIRED, 'admin, editor (actualités, galerie) ou member (espace membre)', 'admin');
        $this->addOption('member', null, InputOption::VALUE_REQUIRED, 'Identifiant Conclave (sub) de la fiche membre à relier au compte');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = $input->getArgument('email');
        $name = $input->getArgument('name');
        \assert(\is_string($email) && \is_string($name));
        $password = $io->askQuestion((new Question('Mot de passe'))->setHidden(true));
        // Aucune saisie (ex. : --no-interaction ou -q) : message clair au lieu d'une erreur technique.
        if (!\is_string($password) || '' === $password) {
            $io->error('Mot de passe requis : lance la commande dans un terminal interactif (docker exec -it …).');

            return Command::FAILURE;
        }

        $violations = $this->validator->validate($password, [
            new Assert\Length(min: 12),
            new Assert\PasswordStrength(),
            new Assert\NotCompromisedPassword(skipOnError: true),
        ]);
        $violations->addAll($this->validator->validate($email, [new Assert\Email()]));
        $violations->addAll($this->validator->validate($name, [new Assert\NotBlank(), new Assert\Length(max: 80)]));
        if (\count($violations) > 0) {
            foreach ($violations as $violation) {
                $io->error((string) $violation->getMessage());
            }

            return Command::FAILURE;
        }

        $user = new User($email, $name);
        $role = match ($input->getOption('role')) {
            'admin' => 'ROLE_ADMIN',
            'editor' => 'ROLE_EDITOR',
            'member' => 'ROLE_MEMBER',
            default => null,
        };
        if (null === $role) {
            $io->error('Rôle inconnu : admin, editor ou member.');

            return Command::FAILURE;
        }
        $user->setRoles([$role]);
        $sub = $input->getOption('member');
        if (\is_string($sub) && '' !== $sub) {
            $user->setConclaveSub($sub);
        }
        $user->setPassword($this->hasher->hashPassword($user, $password));
        $this->em->persist($user);
        $this->em->flush();

        $io->success(\sprintf('Utilisateur %s créé.', $email));

        return Command::SUCCESS;
    }
}

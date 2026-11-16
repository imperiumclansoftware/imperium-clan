<?php

declare(strict_types=1);

namespace App\Command;

use App\Setup\SetupState;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:setup:token', description: 'Instance neuve : génère le jeton à saisir sur la page /installation pour créer le premier administrateur.')]
final class SetupTokenCommand extends Command
{
    public function __construct(private readonly SetupState $setup)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('url', null, InputOption::VALUE_REQUIRED, 'Adresse publique du site, pour afficher le lien complet');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        if (!$this->setup->isRequired()) {
            $this->setup->clearToken();
            $io->writeln('Installation déjà effectuée : aucun jeton généré.');

            return Command::SUCCESS;
        }

        $url = $input->getOption('url');
        $page = (\is_string($url) && '' !== $url ? rtrim($url, '/') : '').'/installation';
        if ($this->setup->usesEnvToken()) {
            $io->note(\sprintf('Instance neuve : ouvre %s et saisis le jeton défini dans SETUP_TOKEN.', $page));

            return Command::SUCCESS;
        }

        $io->block([
            'Instance neuve : crée le premier administrateur sur '.$page,
            'Jeton d’installation : '.$this->setup->issueToken(),
            'Il change à chaque démarrage tant que l’installation n’est pas faite.',
        ], 'INSTALLATION', 'fg=black;bg=yellow', ' ', true);

        return Command::SUCCESS;
    }
}

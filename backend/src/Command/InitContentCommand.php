<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ClanPage;
use App\Entity\Member;
use App\Entity\Tool;
use App\Enum\Branch;
use App\Repository\ClanPageRepository;
use App\Repository\MemberRepository;
use App\Repository\ToolRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(name: 'app:content:init', description: 'Crée le contenu de départ (outils Conclave et Avenger, sections de présentation) s’il n’existe pas.')]
final class InitContentCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ToolRepository $tools,
        private readonly ClanPageRepository $pages,
        private readonly MemberRepository $members,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('demo-members', null, InputOption::VALUE_NONE, 'Ajoute des membres de démonstration (environnement dev uniquement)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if ([] === $this->tools->findAll()) {
            $conclave = new Tool('Conclave', 'https://www.imperiumclan.fr', 'Le quartier général privé du clan : messagerie, présences Discord, événements, jeux, films et news.', 10);
            $conclave->setBranches(Branch::cases());
            $avenger = new Tool('Avenger', 'https://avenger.imperiumclan.fr', 'La vitrine des projets open source du clan : wiki, suivi des bugs, retours et idées.', 20);
            $avenger->setBranches([Branch::ICS]);
            $this->em->persist($conclave);
            $this->em->persist($avenger);
            $io->writeln('Outils Conclave et Avenger créés.');
        }

        if ([] === $this->pages->findAll()) {
            $sections = [
                ['qui-sommes-nous', 'Qui sommes-nous', "Imperium est un clan de joueurs, de fans, de conteurs et de développeurs.\n\nQuatre branches, un seul clan — et chacun peut en rejoindre plusieurs."],
                ['nos-valeurs', 'Nos valeurs', "Respect, entraide et fair-play, en jeu comme en dehors.\n\nOn œuvre ensemble : chaque membre apporte sa pierre, quelle que soit sa branche."],
                ['reglement', 'Règlement', 'Texte du règlement à compléter depuis l’administration.'],
            ];
            foreach ($sections as $i => [$slug, $title, $body]) {
                $this->em->persist(new ClanPage($slug, $title, $body, ($i + 1) * 10));
            }
            $io->writeln('Sections de présentation créées.');
        }

        if ($input->getOption('demo-members')) {
            if ('dev' !== $this->environment) {
                $io->error('Les membres de démonstration ne sont autorisés qu’en environnement dev.');

                return Command::FAILURE;
            }
            if ([] === $this->members->findAll()) {
                $demo = [
                    ['Démo Aquila', 'Fondateur', [Branch::ICG, Branch::ICS]],
                    ['Démo Lyra', 'Communicante', [Branch::ICC, Branch::ICF]],
                    ['Démo Corvus', null, [Branch::ICG]],
                    ['Démo Vesta', 'Cinéphile en chef', [Branch::ICF]],
                    ['Démo Orion', 'Développeur', [Branch::ICS, Branch::ICG, Branch::ICF]],
                    ['Démo Nyx', null, [Branch::ICC]],
                ];
                foreach ($demo as $i => [$pseudo, $title, $branches]) {
                    $member = new Member('demo-'.$i, $pseudo);
                    $member->updateProfile($pseudo, $title, 'Membre de démonstration, remplacé par la synchronisation Conclave.');
                    $member->setBranches($branches);
                    $this->em->persist($member);
                }
                $io->writeln('Membres de démonstration créés.');
            }
        }

        $this->em->flush();
        $io->success('Contenu de départ en place.');

        return Command::SUCCESS;
    }
}

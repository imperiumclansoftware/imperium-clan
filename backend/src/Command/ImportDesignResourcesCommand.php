<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Resource;
use App\Enum\ResourceCategory;
use App\Media\ResourceStorage;
use App\Repository\ResourceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/** Importe les logos de la charte (dépôt imperium_design cloné localement) comme ressources graphiques. */
#[AsCommand(name: 'app:resources:import-design', description: 'Importe les logos du dépôt imperium_design comme ressources graphiques (ignore ceux déjà importés).')]
final class ImportDesignResourcesCommand extends Command
{
    /** Fichier => [titre, description]. Sélection utile aux membres, dans l'ordre d'affichage. */
    private const array LOGOS = [
        'logo/avec-fond/imperium-logo-horizontal-fond-sombre-avec-fond.svg' => ['Logo horizontal — fond sombre (SVG)', 'Version principale, pour bannières et en-têtes.'],
        'logo/png/imperium-logo-horizontal-fond-sombre.png' => ['Logo horizontal — fond sombre (PNG)', 'PNG 1024 px avec fond.'],
        'logo/png/imperium-logo-horizontal-fond-clair.png' => ['Logo horizontal — fond clair (PNG)', 'À poser sur ivoire ou blanc.'],
        'logo/avec-fond/imperium-logo-vertical-fond-sombre-avec-fond.svg' => ['Logo vertical — fond sombre (SVG)', 'Pour affiches et couvertures.'],
        'logo/png/imperium-logo-vertical-fond-sombre.png' => ['Logo vertical — fond sombre (PNG)', 'PNG 1024 px avec fond.'],
        'logo/png/imperium-sceau-fond-sombre.png' => ['Sceau du clan — fond sombre (PNG)', 'Avatar, icône, photo de profil.'],
        'logo/png/imperium-sceau-fond-sombre-transparent.png' => ['Sceau du clan — transparent (PNG)', 'À poser sur un fond sombre.'],
        'logo/png/imperium-sceau-mono-blanc-transparent.png' => ['Sceau monochrome blanc (PNG)', 'Pour photos et fonds colorés.'],
        'logo/png/imperium-sceau-mono-noir-transparent.png' => ['Sceau monochrome noir (PNG)', 'Pour impression, tampon, gravure.'],
        'logo/avec-fond/imperium-sceau-fond-sombre-avec-fond.svg' => ['Sceau du clan — fond sombre (SVG)', 'Vectoriel, toutes tailles.'],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ResourceStorage $storage,
        private readonly ResourceRepository $resources,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('path', InputArgument::REQUIRED, 'Chemin du clone de imperium_design');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('path');
        if (!\is_string($path) || !is_dir($path)) {
            $io->error('Dossier introuvable.');

            return Command::FAILURE;
        }
        $root = rtrim($path, '/');
        $existing = array_map(static fn (Resource $r): string => $r->getTitle(), $this->resources->findAll());
        $count = 0;
        $position = 10;
        foreach (self::LOGOS as $relative => [$title, $description]) {
            $position += 10;
            if (\in_array($title, $existing, true)) {
                continue;
            }
            $file = $root.'/'.$relative;
            if (!is_file($file)) {
                $io->warning('Introuvable : '.$relative);
                continue;
            }
            $stored = $this->storage->import($file);
            $this->em->persist(new Resource($title, ResourceCategory::Graphics, $stored['file'], $stored['downloadName'], $stored['mime'], $stored['size'], $description, $position));
            ++$count;
        }
        $this->em->flush();
        $io->success(\sprintf('%d ressource(s) importée(s).', $count));

        return Command::SUCCESS;
    }
}

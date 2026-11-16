<?php

declare(strict_types=1);

namespace App\Command;

use App\Member\MemberSyncException;
use App\Member\MemberSynchronizer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:members:sync', description: 'Synchronise les membres publics depuis Conclave (à planifier toutes les 15 min).')]
final class SyncMembersCommand extends Command
{
    public function __construct(private readonly MemberSynchronizer $sync)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        try {
            $report = $this->sync->run();
        } catch (MemberSyncException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }
        $io->success(\sprintf('%d créé(s), %d mis à jour, %d retiré(s).', $report['created'], $report['updated'], $report['removed']));

        return Command::SUCCESS;
    }
}

<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\JoinRequestRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:join-requests:purge', description: 'RGPD : supprime les candidatures de plus de 6 mois (à planifier chaque jour).')]
final class PurgeJoinRequestsCommand extends Command
{
    public function __construct(private readonly JoinRequestRepository $requests)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $count = $this->requests->deleteOlderThan(new \DateTimeImmutable('-6 months'));
        (new SymfonyStyle($input, $output))->success(\sprintf('%d candidature(s) supprimée(s).', $count));

        return Command::SUCCESS;
    }
}

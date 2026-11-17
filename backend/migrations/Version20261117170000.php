<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261117170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Membres : grade du règlement (Empereur, Officier, Parrain, Membre), attribué dans l’administration';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE member ADD clan_rank VARCHAR(10) DEFAULT 'membre' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE member DROP clan_rank');
    }
}

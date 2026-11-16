<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261110170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Zones des branches : présentation éditable de chaque branche';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE branch_profile (id UUID NOT NULL, intro VARCHAR(300) NOT NULL, body TEXT NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, branch VARCHAR(3) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9AA36E01BB861B1F ON branch_profile (branch)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE branch_profile');
    }
}

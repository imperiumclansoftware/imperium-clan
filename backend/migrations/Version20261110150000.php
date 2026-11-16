<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261110150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Espace membre : ressources téléchargeables et lien compte ↔ fiche membre';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE clan_resource (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, title VARCHAR(120) NOT NULL, category VARCHAR(20) NOT NULL, file VARCHAR(64) NOT NULL, download_name VARCHAR(120) NOT NULL, mime_type VARCHAR(80) NOT NULL, size INT NOT NULL, description TEXT NOT NULL, position INT NOT NULL, published BOOLEAN NOT NULL, PRIMARY KEY (id))');
        $this->addSql('ALTER TABLE app_user ADD conclave_sub VARCHAR(64) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_88BDF3E95FF433B5 ON app_user (conclave_sub)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_88BDF3E95FF433B5');
        $this->addSql('ALTER TABLE app_user DROP conclave_sub');
        $this->addSql('DROP TABLE clan_resource');
    }
}

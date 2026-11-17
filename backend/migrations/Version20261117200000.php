<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261117200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Connexion avec Conclave (ADR 0003) : comptes sans e-mail, date de dernière connexion';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user ALTER email DROP NOT NULL');
        $this->addSql('ALTER TABLE app_user ADD last_login_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DELETE FROM app_user WHERE email IS NULL');
        $this->addSql('ALTER TABLE app_user DROP last_login_at');
        $this->addSql('ALTER TABLE app_user ALTER email SET NOT NULL');
    }
}

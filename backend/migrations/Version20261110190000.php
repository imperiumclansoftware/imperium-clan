<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261110190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Galerie : événements (albums) regroupant des images';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE gallery_event (id UUID NOT NULL, description TEXT NOT NULL, published BOOLEAN NOT NULL, slug VARCHAR(140) NOT NULL, title VARCHAR(120) NOT NULL, event_date DATE NOT NULL, branches JSON NOT NULL, cover_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_DF33DA84989D9B62 ON gallery_event (slug)');
        $this->addSql('CREATE INDEX idx_gallery_event_date ON gallery_event (event_date)');
        $this->addSql('CREATE INDEX IDX_DF33DA84922726E9 ON gallery_event (cover_id)');
        $this->addSql('ALTER TABLE gallery_image ADD event_id UUID DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_21A0D47C71F7E88B ON gallery_image (event_id)');
        $this->addSql('ALTER TABLE gallery_event ADD CONSTRAINT FK_DF33DA84922726E9 FOREIGN KEY (cover_id) REFERENCES gallery_image (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE gallery_image ADD CONSTRAINT FK_21A0D47C71F7E88B FOREIGN KEY (event_id) REFERENCES gallery_event (id) ON DELETE SET NULL NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE gallery_image DROP CONSTRAINT FK_21A0D47C71F7E88B');
        $this->addSql('ALTER TABLE gallery_event DROP CONSTRAINT FK_DF33DA84922726E9');
        $this->addSql('DROP INDEX IDX_21A0D47C71F7E88B');
        $this->addSql('ALTER TABLE gallery_image DROP event_id');
        $this->addSql('DROP TABLE gallery_event');
    }
}

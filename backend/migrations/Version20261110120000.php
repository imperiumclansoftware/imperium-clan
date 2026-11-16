<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261110120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Schéma initial du portail Imperium Clan';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE clan_page (id UUID NOT NULL, slug VARCHAR(60) NOT NULL, title VARCHAR(120) NOT NULL, body TEXT NOT NULL, position INT NOT NULL, published BOOLEAN NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_94910466989D9B62 ON clan_page (slug)');
        $this->addSql('CREATE TABLE gallery_image (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, file VARCHAR(64) NOT NULL, width INT NOT NULL, height INT NOT NULL, caption VARCHAR(200) NOT NULL, branches JSON NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_gallery_file ON gallery_image (file)');
        $this->addSql('CREATE TABLE join_request (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, status VARCHAR(10) NOT NULL, decided_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, pseudo VARCHAR(40) NOT NULL, email VARCHAR(180) NOT NULL, discord VARCHAR(40) DEFAULT NULL, message TEXT NOT NULL, branches JSON NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE member (id UUID NOT NULL, pseudo VARCHAR(40) NOT NULL, title VARCHAR(60) DEFAULT NULL, bio TEXT DEFAULT NULL, avatar_file VARCHAR(64) DEFAULT NULL, avatar_checksum VARCHAR(32) DEFAULT NULL, synced_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, conclave_sub VARCHAR(64) NOT NULL, branches JSON NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_70E4FA785FF433B5 ON member (conclave_sub)');
        $this->addSql('CREATE INDEX idx_member_avatar ON member (avatar_file)');
        $this->addSql('CREATE TABLE news_article (id UUID NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, published_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, cover_file VARCHAR(64) DEFAULT NULL, slug VARCHAR(160) NOT NULL, title VARCHAR(160) NOT NULL, excerpt VARCHAR(300) NOT NULL, body TEXT NOT NULL, author VARCHAR(80) NOT NULL, branches JSON NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_55DE1280989D9B62 ON news_article (slug)');
        $this->addSql('CREATE INDEX idx_news_published ON news_article (published_at)');
        $this->addSql('CREATE INDEX idx_news_cover ON news_article (cover_file)');
        $this->addSql('CREATE TABLE tool (id UUID NOT NULL, name VARCHAR(60) NOT NULL, url VARCHAR(255) NOT NULL, description TEXT NOT NULL, position INT NOT NULL, published BOOLEAN NOT NULL, branches JSON NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE app_user (id UUID NOT NULL, roles JSON NOT NULL, password VARCHAR(255) DEFAULT NULL, email VARCHAR(180) NOT NULL, display_name VARCHAR(80) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_88BDF3E9E7927C74 ON app_user (email)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE clan_page');
        $this->addSql('DROP TABLE gallery_image');
        $this->addSql('DROP TABLE join_request');
        $this->addSql('DROP TABLE member');
        $this->addSql('DROP TABLE news_article');
        $this->addSql('DROP TABLE tool');
        $this->addSql('DROP TABLE app_user');
    }
}

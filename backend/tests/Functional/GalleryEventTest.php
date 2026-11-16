<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\GalleryEvent;
use App\Entity\GalleryImage;
use App\Media\ImageStorage;

final class GalleryEventTest extends ApiTestCase
{
    public function testDraftEventAndItsImagesAreHiddenFromThePublic(): void
    {
        [$event, $image] = $this->eventWithImage(published: false);
        $loose = $this->image();

        $this->client->request('GET', '/api/public/gallery/events');
        self::assertSame([], $this->json()['items']);
        $this->client->request('GET', '/api/public/gallery/events/'.$event->getSlug());
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/api/public/gallery');
        self::assertSame([(string) $loose->getId()], array_column((array) $this->json()['items'], 'id'), 'seules les images hors événement');
        $this->client->request('GET', '/api/media/gallery/'.$image->getFile());
        self::assertResponseStatusCodeSame(404);

        // Un éditeur voit l'image du brouillon (aperçu dans l'administration).
        $this->client->loginUser($this->user('ROLE_EDITOR'));
        $this->client->request('GET', '/api/media/gallery/'.$image->getFile());
        self::assertResponseIsSuccessful();
    }

    public function testPublishedEventIsListedWithCountAndCover(): void
    {
        [$event, $image] = $this->eventWithImage(published: true);

        $this->client->request('GET', '/api/public/gallery/events');
        $item = (array) ((array) $this->json()['items'])[0];
        self::assertSame(1, $item['imageCount']);
        self::assertSame('api/media/gallery/'.$image->getFile(), $item['coverUrl']);

        $this->client->request('GET', '/api/public/gallery/events/'.$event->getSlug());
        self::assertResponseIsSuccessful();
        self::assertCount(1, (array) $this->json()['images']);
    }

    public function testEditorCreatesEventsAndCoverMustBelongToTheEvent(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR'));

        $this->send('POST', '/api/admin/gallery/events', ['title' => '', 'date' => '2026-11-07']);
        self::assertResponseStatusCodeSame(422);
        $this->send('POST', '/api/admin/gallery/events', ['title' => 'Soirée jeux', 'date' => '2026-11-07', 'branches' => ['ICG']]);
        self::assertResponseStatusCodeSame(201);
        $created = $this->json();
        self::assertSame('soiree-jeux-2026', $created['slug']);
        self::assertFalse($created['published'], 'brouillon par défaut');

        $foreign = $this->image();
        $this->send('PUT', '/api/admin/gallery/events/'.$this->str($created, 'id'), ['title' => 'Soirée jeux', 'date' => '2026-11-07', 'coverImageId' => (string) $foreign->getId()]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testMoveImagesAndDeleteEventKeepsThem(): void
    {
        [$event] = $this->eventWithImage(published: true);
        $a = $this->image();
        $b = $this->image();
        $this->client->loginUser($this->user('ROLE_EDITOR'));

        $this->send('POST', '/api/admin/gallery/move', ['ids' => [(string) $a->getId(), (string) $b->getId()], 'event' => (string) $event->getId()]);
        self::assertResponseIsSuccessful();
        self::assertSame(2, $this->json()['moved']);
        $this->client->request('GET', '/api/admin/gallery?event='.$event->getId());
        self::assertCount(3, (array) $this->json()['items']);

        $this->send('DELETE', '/api/admin/gallery/events/'.$event->getId());
        self::assertResponseStatusCodeSame(204);
        $this->em->clear();
        self::assertCount(3, $this->em->getRepository(GalleryImage::class)->findBy(['event' => null]));
    }

    public function testVisitorsCannotManageEvents(): void
    {
        $this->send('POST', '/api/admin/gallery/events', ['title' => 'x', 'date' => '2026-11-07']);
        self::assertResponseStatusCodeSame(401);
        $this->client->loginUser($this->user('ROLE_MEMBER'));
        $this->send('POST', '/api/admin/gallery/events', ['title' => 'x', 'date' => '2026-11-07']);
        self::assertResponseStatusCodeSame(403);
    }

    /** @return array{GalleryEvent, GalleryImage} */
    private function eventWithImage(bool $published): array
    {
        $event = new GalleryEvent('soiree-'.bin2hex(random_bytes(3)), 'Soirée', new \DateTimeImmutable('2026-11-07'));
        $event->update('Soirée', new \DateTimeImmutable('2026-11-07'), '', $published);
        $this->em->persist($event);
        $image = $this->image();
        $image->setEvent($event);
        $this->em->flush();

        return [$event, $image];
    }

    /** Image réelle sur disque (le contrôleur de médias vérifie l'existence du fichier). */
    private function image(): GalleryImage
    {
        $png = imagecreatetruecolor(4, 4);
        \assert(false !== $png);
        $tmp = tempnam(sys_get_temp_dir(), 'gal');
        \assert(false !== $tmp);
        imagepng($png, $tmp);
        $storage = self::getContainer()->get(ImageStorage::class);
        \assert($storage instanceof ImageStorage);
        $stored = $storage->store(new \Symfony\Component\HttpFoundation\File\File($tmp), 'gallery');
        $image = new GalleryImage($stored['file'], 4, 4);
        $this->em->persist($image);
        $this->em->flush();

        return $image;
    }

    /** @param array<mixed> $data */
    private function str(array $data, string $key): string
    {
        $value = $data[$key] ?? null;
        self::assertIsString($value);

        return $value;
    }
}

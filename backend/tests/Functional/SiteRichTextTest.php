<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\ClanPage;
use App\EventSubscriber\CsrfDoubleSubmitSubscriber;
use Symfony\Component\BrowserKit\Cookie;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Textes riches de tout le site (présentation, branches, événements) et images insérées dans les textes.
 */
final class SiteRichTextTest extends ApiTestCase
{
    public function testEditorUploadsAContentImageServedPublicly(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));
        $this->upload($this->png());
        self::assertResponseStatusCodeSame(201);
        $url = self::str($this->json(), 'url');
        self::assertMatchesRegularExpression('#^api/media/content/[0-9a-f-]{36}\.png$#', $url);

        // Lisible sans compte (un visiteur lit la page), mis en cache longtemps (nom unique)
        $this->client->getCookieJar()->clear();
        $this->client->restart();
        $this->client->request('GET', '/'.$url);
        self::assertResponseIsSuccessful();
        self::assertStringContainsString('immutable', (string) $this->client->getResponse()->headers->get('Cache-Control'));
    }

    public function testContentImageUploadIsForEditorsAndImagesOnly(): void
    {
        $this->client->loginUser($this->user('ROLE_MEMBER', 'membre@example.test'));
        $this->upload($this->png());
        self::assertResponseStatusCodeSame(403);

        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));
        $tmp = (string) tempnam(sys_get_temp_dir(), 'txt');
        file_put_contents($tmp, '<?php echo "pas une image";');
        $this->upload(new UploadedFile($tmp, 'image.png', 'image/png', test: true));
        self::assertResponseStatusCodeSame(400);
    }

    public function testClanPageStoresRichTextWithLinkAndImage(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN', 'admin@example.test'));
        $this->upload($this->png());
        $image = self::str($this->json(), 'url');

        $this->send('POST', '/api/admin/pages', ['slug' => 'histoire', 'title' => 'Histoire', 'content' => ['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Conclave', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://www.imperiumclan.fr']]]]]],
            ['type' => 'image', 'attrs' => ['src' => $image, 'alt' => 'Le clan']],
            ['type' => 'image', 'attrs' => ['src' => 'https://evil.example/x.png']],
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'piège', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]]]],
        ]]]);
        self::assertResponseStatusCodeSame(201);

        $this->client->request('GET', '/api/public/pages');
        $content = self::at($this->json(), 'items', 0, 'content');
        self::assertSame('doc', self::at($content, 'type'));
        self::assertSame([['type' => 'link', 'attrs' => ['href' => 'https://www.imperiumclan.fr']]], self::at($content, 'content', 0, 'content', 0, 'marks'));
        self::assertSame(['type' => 'image', 'attrs' => ['src' => $image, 'alt' => 'Le clan']], self::at($content, 'content', 1));
        self::assertCount(3, (array) self::at($content, 'content'), 'image extérieure retirée');
        self::assertNull(self::at($content, 'content', 2, 'content', 0, 'marks'), 'lien javascript: retiré');
    }

    public function testLegacyPlainTextIsReadAsParagraphs(): void
    {
        $this->em->persist(new ClanPage('ancien', 'Ancien texte', "Premier paragraphe.\n\nSecond paragraphe.", 0, true));
        $this->em->flush();

        $this->client->request('GET', '/api/public/pages');

        $content = self::at($this->json(), 'items', 0, 'content');
        self::assertSame('paragraph', self::at($content, 'content', 0, 'type'));
        self::assertSame('paragraph', self::at($content, 'content', 1, 'type'));
        self::assertSame('Second paragraphe.', self::at($content, 'content', 1, 'content', 0, 'text'));
    }

    public function testGalleryEventDescriptionIsRichText(): void
    {
        $this->client->loginUser($this->user('ROLE_EDITOR', 'editeur@example.test'));
        $this->send('POST', '/api/admin/gallery/events', ['title' => 'LAN', 'date' => '2026-11-07', 'published' => true, 'description' => ['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Une '], ['type' => 'text', 'text' => 'belle', 'marks' => [['type' => 'bold']]], ['type' => 'text', 'text' => ' soirée']]],
        ]]]);
        self::assertResponseStatusCodeSame(201);
        $slug = self::str($this->json(), 'slug');

        $this->client->request('GET', '/api/public/gallery/events/'.$slug);
        self::assertSame([['type' => 'bold']], self::at($this->json(), 'description', 'content', 0, 'content', 1, 'marks'));
    }

    /** Valeur à un chemin dans une réponse JSON décodée (null si absente). */
    private static function at(mixed $data, string|int ...$path): mixed
    {
        foreach ($path as $key) {
            $data = \is_array($data) ? ($data[$key] ?? null) : null;
        }

        return $data;
    }

    private static function str(mixed $data, string|int ...$path): string
    {
        $value = self::at($data, ...$path);
        self::assertIsString($value);

        return $value;
    }

    private function upload(UploadedFile $file): void
    {
        $this->client->getCookieJar()->set(new Cookie(CsrfDoubleSubmitSubscriber::COOKIE, 'tok'));
        $this->client->request('POST', '/api/admin/content-images', [], ['file' => $file], ['HTTP_X_XSRF_TOKEN' => 'tok']);
    }

    private function png(): UploadedFile
    {
        $tmp = (string) tempnam(sys_get_temp_dir(), 'png');
        $image = imagecreatetruecolor(40, 30);
        imagepng($image, $tmp);

        return new UploadedFile($tmp, 'photo.png', 'image/png', test: true);
    }
}

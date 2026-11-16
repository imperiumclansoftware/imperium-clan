<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Member;
use App\Enum\Branch;
use App\EventSubscriber\CsrfDoubleSubmitSubscriber;
use Symfony\Component\BrowserKit\Cookie;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class MemberAreaTest extends ApiTestCase
{
    public function testSessionIsPublicAndSetsCsrfCookie(): void
    {
        $this->client->request('GET', '/api/session');

        self::assertResponseIsSuccessful();
        self::assertNull($this->json()['user']);
        self::assertResponseHasCookie(CsrfDoubleSubmitSubscriber::COOKIE);
    }

    public function testSessionExposesLinkedMemberProfile(): void
    {
        $member = new Member('conclave-42', 'Aquila');
        $member->setBranches([Branch::ICS, Branch::ICG]);
        $this->em->persist($member);
        $user = $this->user('ROLE_MEMBER', 'aquila@example.test');
        $user->setConclaveSub('conclave-42');
        $this->em->flush();

        $this->client->loginUser($user);
        $this->client->request('GET', '/api/session');

        $session = (array) $this->json()['user'];
        $profile = (array) $session['member'];
        self::assertSame('Aquila', $profile['pseudo']);
        self::assertSame(['ICG', 'ICS'], $profile['branches']);
    }

    public function testResourcesRequireAMember(): void
    {
        $this->client->request('GET', '/api/member/resources');
        self::assertResponseStatusCodeSame(401);

        $this->client->loginUser($this->user('ROLE_MEMBER'));
        $this->client->request('GET', '/api/member/resources');
        self::assertResponseIsSuccessful();

        $this->client->request('GET', '/api/admin/resources');
        self::assertResponseStatusCodeSame(403);
    }

    public function testUploadDownloadAndHiddenResources(): void
    {
        $admin = $this->user('ROLE_ADMIN', 'admin@example.test');
        $this->client->loginUser($admin);

        $png = $this->upload('logo.png', $this->pngBytes(), ['title' => 'Logo', 'category' => 'graphics']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('PNG', $png['format']);
        self::assertNotNull($png['previewUrl']);

        $svg = $this->upload('piege.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', ['title' => 'SVG', 'category' => 'social']);
        self::assertResponseStatusCodeSame(201);
        self::assertNull($svg['previewUrl'], 'un SVG n’est jamais affiché en ligne');

        // Un SVG est toujours servi en pièce jointe, dans un bac à sable sans script.
        $this->client->request('GET', '/'.$this->str($svg, 'downloadUrl').'?inline=1');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('attachment', (string) $this->client->getResponse()->headers->get('Content-Disposition'));
        self::assertStringContainsString('sandbox', (string) $this->client->getResponse()->headers->get('Content-Security-Policy'));

        // Ressource masquée : invisible et non téléchargeable pour un membre.
        $this->send('PUT', '/api/admin/resources/'.$this->str($png, 'id'), ['title' => 'Logo', 'category' => 'graphics', 'published' => false]);
        self::assertResponseIsSuccessful();

        $this->client->loginUser($this->user('ROLE_MEMBER', 'membre@example.test'));
        $this->client->request('GET', '/api/member/resources');
        self::assertSame(['SVG'], array_column((array) $this->json()['items'], 'title'));
        $this->client->request('GET', '/'.$this->str($png, 'downloadUrl'));
        self::assertResponseStatusCodeSame(404);
    }

    public function testRejectsDisguisedFiles(): void
    {
        $this->client->loginUser($this->user('ROLE_ADMIN'));

        $this->upload('image.png', '<?php echo "hello";', ['title' => 'Faux']);

        self::assertResponseStatusCodeSame(400);
    }

    /**
     * @param array<string, string> $fields
     *
     * @return array<mixed>
     */
    private function upload(string $name, string $bytes, array $fields): array
    {
        $tmp = tempnam(sys_get_temp_dir(), 'up');
        \assert(false !== $tmp);
        file_put_contents($tmp, $bytes);
        $this->client->getCookieJar()->set(new Cookie(CsrfDoubleSubmitSubscriber::COOKIE, 'tok'));
        $this->client->request('POST', '/api/admin/resources', $fields, ['file' => new UploadedFile($tmp, $name, test: true)], ['HTTP_X_XSRF_TOKEN' => 'tok']);

        return $this->json();
    }

    /** @param array<mixed> $data */
    private function str(array $data, string $key): string
    {
        $value = $data[$key] ?? null;
        self::assertIsString($value);

        return $value;
    }

    private function pngBytes(): string
    {
        $image = imagecreatetruecolor(4, 4);
        \assert(false !== $image);
        ob_start();
        imagepng($image);

        return (string) ob_get_clean();
    }
}

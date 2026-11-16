<?php

declare(strict_types=1);

namespace App\Tests\Unit\News;

use App\News\RichText;
use PHPUnit\Framework\TestCase;

final class RichTextTest extends TestCase
{
    public function testKeepsAllowedFormatting(): void
    {
        $doc = RichText::normalize(['type' => 'doc', 'content' => [
            ['type' => 'heading', 'attrs' => ['level' => 3], 'content' => [['type' => 'text', 'text' => 'Titre']]],
            ['type' => 'paragraph', 'content' => [
                ['type' => 'text', 'text' => 'gras', 'marks' => [['type' => 'bold'], ['type' => 'italic']]],
                ['type' => 'text', 'text' => 'lien', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://www.imperiumclan.fr', 'target' => '_self', 'onclick' => 'x']]]],
            ]],
            ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'point']]]]]]],
        ]]);

        self::assertSame(['level' => 3], self::at($doc, 'content', 0, 'attrs'));
        self::assertSame([['type' => 'bold'], ['type' => 'italic']], self::at($doc, 'content', 1, 'content', 0, 'marks'));
        self::assertSame([['type' => 'link', 'attrs' => ['href' => 'https://www.imperiumclan.fr']]], self::at($doc, 'content', 1, 'content', 1, 'marks'), 'attributs inconnus retirés');
        self::assertSame('bulletList', self::at($doc, 'content', 2, 'type'));
    }

    public function testRemovesDangerousOrUnknownContent(): void
    {
        $doc = RichText::normalize(['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [
                ['type' => 'text', 'text' => 'piège', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]],
                ['type' => 'text', 'text' => 'données', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'data:text/html,<script>']]]],
                ['type' => 'image', 'attrs' => ['src' => 'https://evil.example/x.png']],
                ['type' => 'text', 'text' => 'code', 'marks' => [['type' => 'highlight', 'attrs' => ['style' => 'x']]]],
            ]],
            ['type' => 'iframe', 'attrs' => ['src' => 'https://evil.example']],
            ['type' => 'heading', 'attrs' => ['level' => 1], 'content' => [['type' => 'text', 'text' => 'H1']]],
        ]]);

        self::assertSame([
            ['type' => 'paragraph', 'content' => [
                ['type' => 'text', 'text' => 'piège'],
                ['type' => 'text', 'text' => 'données'],
                ['type' => 'text', 'text' => 'code'],
            ]],
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [['type' => 'text', 'text' => 'H1']]],
        ], $doc['content']);
    }

    public function testLegacyPlainTextIsConverted(): void
    {
        $doc = RichText::decode("Premier paragraphe\nsuite\n\nSecond");

        self::assertCount(2, $doc['content']);
        self::assertSame('hardBreak', self::at($doc, 'content', 0, 'content', 1, 'type'));
    }

    public function testRejectsHugeDocuments(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        RichText::normalize(['type' => 'doc', 'content' => array_fill(0, 7000, ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x']]])]);
    }

    public function testEmptyDetection(): void
    {
        self::assertTrue(RichText::isEmpty(RichText::normalize(['type' => 'doc', 'content' => [['type' => 'paragraph']]])));
        self::assertFalse(RichText::isEmpty(RichText::fromPlainText('texte')));
    }

    /** @param array<mixed> $data */
    private static function at(array $data, string|int ...$path): mixed
    {
        $value = $data;
        foreach ($path as $key) {
            self::assertIsArray($value);
            $value = $value[$key] ?? null;
        }

        return $value;
    }
}

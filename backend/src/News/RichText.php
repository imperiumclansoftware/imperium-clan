<?php

declare(strict_types=1);

namespace App\News;

/**
 * Texte riche des actualités, au format JSON de l'éditeur (ProseMirror / Tiptap), jamais en HTML.
 *
 * normalize() reconstruit un document PROPRE à partir de la saisie : seuls les nœuds, marques et attributs
 * de la liste blanche sont gardés, les liens n'acceptent que http(s) et mailto. Le front rend ce JSON avec
 * des templates Angular, sans injection de HTML : pas de XSS possible par construction.
 */
final class RichText
{
    private const array BLOCKS = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule'];
    private const array INLINE = ['text', 'hardBreak'];
    private const array MARKS = ['bold', 'italic', 'underline', 'strike', 'link'];
    private const int MAX_DEPTH = 12;
    private const int MAX_NODES = 5000;
    private const int MAX_TEXT = 60000;

    private int $nodes = 0;
    private int $textLength = 0;

    /**
     * @param array<mixed> $input
     *
     * @return array{type: 'doc', content: list<array<string, mixed>>}
     *
     * @throws \InvalidArgumentException document trop gros ou trop profond
     */
    public static function normalize(array $input): array
    {
        $self = new self();
        $content = $self->children($input['content'] ?? [], 0, self::BLOCKS);

        return ['type' => 'doc', 'content' => [] === $content ? [['type' => 'paragraph']] : $content];
    }

    /** @return array{type: 'doc', content: list<array<string, mixed>>} */
    public static function fromPlainText(string $text): array
    {
        $paragraphs = array_values(array_filter(array_map('trim', preg_split('/\R\s*\R/u', $text) ?: []), static fn (string $p): bool => '' !== $p));
        $content = [];
        foreach ($paragraphs as $paragraph) {
            $inline = [];
            foreach (preg_split('/\R/u', $paragraph) ?: [] as $i => $line) {
                if ($i > 0) {
                    $inline[] = ['type' => 'hardBreak'];
                }
                if ('' !== $line) {
                    $inline[] = ['type' => 'text', 'text' => $line];
                }
            }
            $content[] = ['type' => 'paragraph', 'content' => $inline];
        }

        return ['type' => 'doc', 'content' => [] === $content ? [['type' => 'paragraph']] : $content];
    }

    /**
     * Lecture du contenu stocké : JSON de l'éditeur, ou ancien texte brut (converti en paragraphes).
     *
     * @return array{type: 'doc', content: list<array<string, mixed>>}
     */
    public static function decode(string $stored): array
    {
        $data = json_decode($stored, true);
        if (\is_array($data) && 'doc' === ($data['type'] ?? null)) {
            try {
                return self::normalize($data);
            } catch (\InvalidArgumentException) {
            }
        }

        return self::fromPlainText($stored);
    }

    /** @param array<mixed> $doc */
    public static function encode(array $doc): string
    {
        return json_encode($doc, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);
    }

    /** @param array<mixed> $doc */
    public static function isEmpty(array $doc): bool
    {
        return '' === trim(self::plainText($doc));
    }

    /** @param array<mixed> $node */
    public static function plainText(array $node): string
    {
        if ('text' === ($node['type'] ?? null) && \is_string($node['text'] ?? null)) {
            return $node['text'];
        }
        $out = '';
        foreach ((array) ($node['content'] ?? []) as $child) {
            if (\is_array($child)) {
                $out .= self::plainText($child).' ';
            }
        }

        return $out;
    }

    /**
     * @param list<string> $allowed
     *
     * @return list<array<string, mixed>>
     */
    private function children(mixed $children, int $depth, array $allowed): array
    {
        if (!\is_array($children)) {
            return [];
        }
        if ($depth > self::MAX_DEPTH) {
            throw new \InvalidArgumentException('Texte trop imbriqué.');
        }
        $out = [];
        foreach ($children as $child) {
            if (!\is_array($child) || !\in_array($child['type'] ?? null, $allowed, true)) {
                continue; // nœud inconnu : ignoré
            }
            if (++$this->nodes > self::MAX_NODES) {
                throw new \InvalidArgumentException('Texte trop long.');
            }
            $node = $this->node($child, $depth);
            if (null !== $node) {
                $out[] = $node;
            }
        }

        return $out;
    }

    /**
     * @param array<mixed> $n
     *
     * @return array<string, mixed>|null
     */
    private function node(array $n, int $depth): ?array
    {
        $type = \is_string($n['type'] ?? null) ? $n['type'] : '';
        $attrs = \is_array($n['attrs'] ?? null) ? $n['attrs'] : [];

        return match ($type) {
            'text' => $this->text($n),
            'hardBreak', 'horizontalRule' => ['type' => $type],
            'paragraph' => $this->withContent(['type' => 'paragraph'], $n, $depth, self::INLINE),
            'heading' => $this->withContent(['type' => 'heading', 'attrs' => ['level' => 3 === ($attrs['level'] ?? null) ? 3 : 2]], $n, $depth, self::INLINE),
            'bulletList', 'orderedList' => $this->nonEmpty($this->withContent(['type' => $type], $n, $depth, ['listItem'])),
            'listItem' => $this->nonEmpty($this->withContent(['type' => 'listItem'], $n, $depth, ['paragraph', 'bulletList', 'orderedList'])),
            'blockquote' => $this->nonEmpty($this->withContent(['type' => 'blockquote'], $n, $depth, ['paragraph', 'bulletList', 'orderedList'])),
            default => null,
        };
    }

    /**
     * @param array<string, mixed> $base
     * @param array<mixed>         $n
     * @param list<string>         $allowed
     *
     * @return array<string, mixed>
     */
    private function withContent(array $base, array $n, int $depth, array $allowed): array
    {
        $content = $this->children($n['content'] ?? [], $depth + 1, $allowed);

        return [] === $content ? $base : $base + ['content' => $content];
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>|null
     */
    private function nonEmpty(array $node): ?array
    {
        return isset($node['content']) ? $node : null;
    }

    /**
     * @param array<mixed> $n
     *
     * @return array<string, mixed>|null
     */
    private function text(array $n): ?array
    {
        $text = $n['text'] ?? null;
        if (!\is_string($text) || '' === $text) {
            return null;
        }
        $text = mb_substr($text, 0, 10000);
        $this->textLength += mb_strlen($text);
        if ($this->textLength > self::MAX_TEXT) {
            throw new \InvalidArgumentException('Texte trop long.');
        }
        $marks = [];
        foreach ((array) ($n['marks'] ?? []) as $mark) {
            if (!\is_array($mark) || !\in_array($mark['type'] ?? null, self::MARKS, true)) {
                continue;
            }
            if ('link' === $mark['type']) {
                $markAttrs = \is_array($mark['attrs'] ?? null) ? $mark['attrs'] : [];
                $href = self::safeHref($markAttrs['href'] ?? null);
                if (null !== $href) {
                    $marks[] = ['type' => 'link', 'attrs' => ['href' => $href]];
                }
                continue;
            }
            $marks[] = ['type' => $mark['type']];
        }

        return [] === $marks ? ['type' => 'text', 'text' => $text] : ['type' => 'text', 'text' => $text, 'marks' => $marks];
    }

    /** Lien accepté : http(s) ou mailto, sans espace ni caractère de contrôle. */
    public static function safeHref(mixed $href): ?string
    {
        if (!\is_string($href) || \strlen($href) > 2000 || preg_match('/[\s\x00-\x1F\x7F]/', $href)) {
            return null;
        }
        $scheme = strtolower((string) parse_url($href, \PHP_URL_SCHEME));
        if (\in_array($scheme, ['http', 'https'], true) && false !== filter_var($href, \FILTER_VALIDATE_URL)) {
            return $href;
        }
        if ('mailto' === $scheme && false !== filter_var(substr($href, 7), \FILTER_VALIDATE_EMAIL)) {
            return $href;
        }

        return null;
    }
}

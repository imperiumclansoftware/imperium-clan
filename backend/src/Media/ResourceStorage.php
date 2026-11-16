<?php

declare(strict_types=1);

namespace App\Media;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Mime\MimeTypes;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Symfony\Component\Uid\Uuid;

/**
 * Fichiers des ressources membres, stockés hors de public/ (var/uploads/resources).
 * Le type vient du contenu RÉEL (finfo), le nom de stockage d'un UUID ; le nom d'origine n'est gardé
 * que, nettoyé, comme nom de téléchargement.
 */
final readonly class ResourceStorage
{
    /** MIME réel accepté => extension. */
    public const array ALLOWED_MIME = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
        'application/pdf' => 'pdf',
        'application/zip' => 'zip',
    ];
    public const int MAX_BYTES = 30 * 1024 * 1024;

    /** Types affichables en aperçu dans la page (images matricielles uniquement, jamais SVG). */
    public const array PREVIEWABLE = ['image/png', 'image/jpeg', 'image/webp'];

    public function __construct(
        #[Autowire('%kernel.project_dir%/var/uploads/resources')]
        private string $directory,
    ) {
    }

    /** @return array{file: string, mime: string, size: int, downloadName: string} */
    public function store(File $file, string $originalName): array
    {
        $size = (int) $file->getSize();
        if ($size < 1 || $size > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Fichier vide ou de plus de 30 Mo.');
        }
        $mime = MimeTypes::getDefault()->guessMimeType($file->getPathname());
        // finfo peut annoncer un SVG sans en-tête XML comme « image/svg » ou « text/xml »
        if (\in_array($mime, ['image/svg', 'text/xml', 'application/xml', 'text/plain'], true) && $this->looksLikeSvg($file)) {
            $mime = 'image/svg+xml';
        }
        $extension = null !== $mime ? (self::ALLOWED_MIME[$mime] ?? null) : null;
        if (null === $mime || null === $extension) {
            throw new \InvalidArgumentException('Format non accepté (PNG, JPEG, WebP, SVG, PDF ou ZIP).');
        }

        $name = Uuid::v4()->toRfc4122().'.'.$extension;
        $file->move($this->directory, $name);

        return ['file' => $name, 'mime' => $mime, 'size' => $size, 'downloadName' => self::downloadName($originalName, $extension)];
    }

    /**
     * Copie un fichier local (import de la charte) avec les mêmes vérifications.
     *
     * @return array{file: string, mime: string, size: int, downloadName: string}
     */
    public function import(string $path): array
    {
        $tmp = tempnam(sys_get_temp_dir(), 'res');
        if (false === $tmp || !copy($path, $tmp)) {
            throw new \RuntimeException('Copie impossible.');
        }
        try {
            return $this->store(new File($tmp), basename($path));
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }

    public function path(string $name): ?string
    {
        if (!preg_match('/^[0-9a-f-]{36}\.(png|jpg|webp|svg|pdf|zip)$/', $name)) {
            return null;
        }
        $path = $this->directory.'/'.$name;

        return is_file($path) ? $path : null;
    }

    public function delete(string $name): void
    {
        if (null !== ($path = $this->path($name))) {
            unlink($path);
        }
    }

    public static function downloadName(string $original, string $extension): string
    {
        $base = pathinfo($original, \PATHINFO_FILENAME);
        $slug = (new AsciiSlugger())->slug($base)->lower()->toString();

        return mb_substr('' !== $slug ? $slug : 'ressource', 0, 100).'.'.$extension;
    }

    private function looksLikeSvg(File $file): bool
    {
        $head = (string) file_get_contents($file->getPathname(), false, null, 0, 1024);

        return 1 === preg_match('/<svg[\s>]/i', $head);
    }
}

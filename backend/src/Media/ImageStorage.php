<?php

declare(strict_types=1);

namespace App\Media;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Mime\MimeTypes;
use Symfony\Component\Uid\Uuid;

/**
 * Stockage des images hors de public/ (var/uploads/{dossier}/). Le nom vient d'un UUID et l'extension
 * du MIME RÉEL détecté (finfo), jamais du nom ou du type envoyés par le client.
 * Les fichiers sont servis par MediaController, qui vérifie qu'ils sont publics.
 */
final readonly class ImageStorage
{
    public const array ALLOWED_MIME = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    public const string MAX_SIZE = '8M';
    public const array FOLDERS = ['avatars', 'gallery', 'news', 'content'];

    public function __construct(
        #[Autowire('%kernel.project_dir%/var/uploads')]
        private string $root,
    ) {
    }

    /** @return array{file: string, width: int, height: int} */
    public function store(File $file, string $folder): array
    {
        $mime = MimeTypes::getDefault()->guessMimeType($file->getPathname());
        $extension = null !== $mime ? (self::ALLOWED_MIME[$mime] ?? null) : null;
        if (null === $extension) {
            throw new \InvalidArgumentException('Format d’image non accepté.');
        }
        $size = @getimagesize($file->getPathname());
        if (false === $size || $size[0] < 1 || $size[1] < 1 || $size[0] * $size[1] > 50_000_000) {
            throw new \InvalidArgumentException('Image illisible ou trop grande.');
        }

        $name = Uuid::v4()->toRfc4122().'.'.$extension;
        $file->move($this->directory($folder), $name);

        return ['file' => $name, 'width' => $size[0], 'height' => $size[1]];
    }

    /** Stocke des octets téléchargés (avatars Conclave) après les mêmes vérifications. */
    public function storeBytes(string $bytes, string $folder): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'img');
        if (false === $tmp) {
            throw new \RuntimeException('Fichier temporaire impossible.');
        }
        try {
            file_put_contents($tmp, $bytes);

            return $this->store(new File($tmp), $folder)['file'];
        } finally {
            if (is_file($tmp)) {
                unlink($tmp);
            }
        }
    }

    /** Chemin absolu d'un fichier stocké, ou null si le nom est invalide ou absent. */
    public function path(string $folder, string $name): ?string
    {
        // Le nom est toujours de la forme UUID.ext : on refuse tout le reste (pas de ../).
        if (!preg_match('/^[0-9a-f-]{36}\.(jpg|png|webp)$/', $name)) {
            return null;
        }
        $path = $this->directory($folder).'/'.$name;

        return is_file($path) ? $path : null;
    }

    public function delete(string $folder, ?string $name): void
    {
        if (null !== $name && null !== ($path = $this->path($folder, $name))) {
            unlink($path);
        }
    }

    private function directory(string $folder): string
    {
        if (!\in_array($folder, self::FOLDERS, true)) {
            throw new \InvalidArgumentException('Dossier inconnu.');
        }

        return $this->root.'/'.$folder;
    }
}

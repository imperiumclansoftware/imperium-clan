<?php

declare(strict_types=1);

namespace App\Controller\Public;

use App\Media\ImageStorage;
use App\Repository\GalleryImageRepository;
use App\Repository\MemberRepository;
use App\Repository\NewsArticleRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sert les images stockées hors de public/. Un fichier n'est servi que s'il est rattaché à un contenu
 * public (membre, image de galerie, couverture d'actualité publiée) ; les éditeurs voient aussi les
 * couvertures des brouillons. Les images des textes riches (« content ») sont publiques : leur nom UUID v4
 * n'est pas devinable, et un texte en brouillon ne doit pas casser son aperçu.
 */
final class MediaController extends AbstractController
{
    #[Route('/api/media/{folder}/{file}', name: 'media', requirements: ['folder' => 'avatars|gallery|news|content', 'file' => '[0-9a-f-]{36}\.(jpg|png|webp)'], methods: ['GET'])]
    public function show(
        string $folder,
        string $file,
        ImageStorage $storage,
        MemberRepository $members,
        GalleryImageRepository $gallery,
        NewsArticleRepository $news,
    ): BinaryFileResponse {
        $visible = match ($folder) {
            'avatars' => null !== $members->findOneBy(['avatarFile' => $file]),
            'content' => true,
            // Image d'un événement en brouillon : invisible du public, visible des éditeurs.
            'gallery' => $gallery->isPublicFile($file)
                || ($this->isGranted('ROLE_EDITOR') && null !== $gallery->findOneBy(['file' => $file])),
            'news' => $news->isPublishedCover($file)
                || ($this->isGranted('ROLE_EDITOR') && null !== $news->findOneBy(['coverFile' => $file])),
            default => false,
        };
        $path = $visible ? $storage->path($folder, $file) : null;
        if (null === $path) {
            throw $this->createNotFoundException();
        }

        $response = new BinaryFileResponse($path);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $file);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        // Les images peuvent être affichées par le front (même site) : CORP same-site au lieu de same-origin.
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-site');
        if ('content' === $folder) {
            $response->setPublic();
            $response->setMaxAge(31536000);
            $response->setImmutable(); // nom unique : le fichier ne change jamais
        } elseif ('avatars' === $folder) {
            $response->setPublic();
            $response->setMaxAge(86400);
        } else {
            $response->setPrivate();
        }

        return $response;
    }
}

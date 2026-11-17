<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Media\ImageStorage;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Images insérées dans les textes riches (actualités, présentation, branches, événements). Stockées comme
 * les autres images (MIME réel, nom UUID v4, hors de public/), puis référencées par le texte : seules
 * ces URL sont acceptées par App\News\RichText.
 */
#[Route('/api/admin/content-images')]
#[IsGranted('ROLE_EDITOR')]
final class ContentImageController extends AdminController
{
    public function __construct(private readonly ImageStorage $storage)
    {
    }

    #[Route('', name: 'admin_content_image_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $file = $this->uploadedImage($request);
        if (null === $file) {
            return $this->problem('Envoie une image JPEG, PNG ou WebP de 8 Mo maximum.');
        }
        try {
            $stored = $this->storage->store($file, 'content');
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage());
        }

        return $this->json([
            'url' => (string) Presenter::media('content', $stored['file']),
            'width' => $stored['width'],
            'height' => $stored['height'],
        ], Response::HTTP_CREATED);
    }
}

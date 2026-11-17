<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\News\RichText;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/** Outils communs aux contrôleurs d'administration. */
abstract class AdminController extends AbstractController
{
    protected function problem(string $detail, int $status = 400): JsonResponse
    {
        return $this->json(['detail' => $detail], $status);
    }

    /**
     * Texte riche saisi dans l'éditeur, nettoyé (liste blanche) et sérialisé ; réponse 422 si invalide.
     *
     * @param array<mixed> $input
     */
    protected function richText(array $input): string|JsonResponse
    {
        try {
            return RichText::fromInput($input);
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage(), 422);
        }
    }

    /** Fichier envoyé valide et de taille acceptable, sinon null (le MIME réel est vérifié par ImageStorage). */
    protected function uploadedImage(Request $request): ?UploadedFile
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid() || $file->getSize() > 8 * 1024 * 1024) {
            return null;
        }

        return $file;
    }
}

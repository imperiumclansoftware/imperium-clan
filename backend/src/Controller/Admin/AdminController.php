<?php

declare(strict_types=1);

namespace App\Controller\Admin;

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

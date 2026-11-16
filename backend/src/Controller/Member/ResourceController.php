<?php

declare(strict_types=1);

namespace App\Controller\Member;

use App\Api\Presenter;
use App\Entity\Resource;
use App\Media\ResourceStorage;
use App\Repository\ResourceRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/** Espace membre : ressources téléchargeables, réservées aux membres connectés. */
#[Route('/api/member/resources')]
#[IsGranted('ROLE_MEMBER')]
final class ResourceController extends AbstractController
{
    #[Route('', name: 'member_resources', methods: ['GET'])]
    public function list(ResourceRepository $resources): JsonResponse
    {
        return $this->json(['items' => array_map(static fn (Resource $r) => Presenter::resource($r), $resources->findAllOrdered(publishedOnly: true))]);
    }

    #[Route('/{id}/file', name: 'member_resource_file', requirements: ['id' => Requirement::UUID], methods: ['GET'])]
    public function download(Resource $resource, ResourceStorage $storage, #[MapQueryParameter] bool $inline = false): BinaryFileResponse
    {
        // Une ressource masquée n'existe pas pour les membres ; l'admin peut la prévisualiser.
        $path = $resource->isPublished() || $this->isGranted('ROLE_ADMIN') ? $storage->path($resource->getFile()) : null;
        if (null === $path) {
            throw $this->createNotFoundException();
        }

        // Aperçu en ligne : images matricielles uniquement. SVG, PDF, ZIP : toujours en pièce jointe.
        $inline = $inline && \in_array($resource->getMimeType(), ResourceStorage::PREVIEWABLE, true);
        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $resource->getMimeType());
        $response->setContentDisposition($inline ? ResponseHeaderBag::DISPOSITION_INLINE : ResponseHeaderBag::DISPOSITION_ATTACHMENT, $resource->getDownloadName());
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        // Même ouvert directement, un fichier (SVG piégé…) ne peut exécuter aucun script.
        $response->headers->set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-site');
        $response->setPrivate();
        $response->setMaxAge(3600);

        return $response;
    }
}

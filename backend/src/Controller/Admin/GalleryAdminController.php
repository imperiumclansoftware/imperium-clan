<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\CaptionInput;
use App\Dto\Admin\MoveImagesInput;
use App\Entity\GalleryImage;
use App\Media\ImageStorage;
use App\Repository\GalleryEventRepository;
use App\Repository\GalleryImageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

#[Route('/api/admin/gallery')]
#[IsGranted('ROLE_EDITOR')]
final class GalleryAdminController extends AdminController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ImageStorage $storage,
        private readonly GalleryImageRepository $images,
        private readonly GalleryEventRepository $events,
    ) {
    }

    /** ?event=<uuid> : images d'un événement ; ?event=none : images hors événement ; sinon toutes. */
    #[Route('', name: 'admin_gallery_list', methods: ['GET'])]
    public function list(#[MapQueryParameter] ?string $event = null, #[MapQueryParameter] int $page = 1, #[MapQueryParameter] int $size = 200): JsonResponse
    {
        $filter = null;
        if (null !== $event && 'none' !== $event) {
            $filter = Uuid::isValid($event) ? $this->events->find($event) : null;
            if (null === $filter) {
                throw $this->createNotFoundException();
            }
        }
        $items = $this->images->findForAdmin($filter, 'none' === $event, $page, $size);

        return $this->json(['items' => array_map(static fn (GalleryImage $g) => Presenter::galleryImage($g, true), $items), 'page' => $page]);
    }

    /** Déplace plusieurs images vers un événement, ou hors événement (`event` null). */
    #[Route('/move', name: 'admin_gallery_move', methods: ['POST'])]
    public function move(#[MapRequestPayload] MoveImagesInput $input): JsonResponse
    {
        $target = null;
        if (null !== $input->event) {
            $target = $this->events->find($input->event);
            if (null === $target) {
                return $this->problem('Événement introuvable.', Response::HTTP_NOT_FOUND);
            }
        }
        $images = $this->images->findByIds($input->ids);
        foreach ($images as $image) {
            $previous = $image->getEvent();
            // Une image qui quitte un événement ne peut plus en être la couverture.
            if (null !== $previous && $previous->getCover() === $image) {
                $previous->setCover(null);
            }
            $image->setEvent($target);
        }
        $this->em->flush();

        return $this->json(['moved' => \count($images)]);
    }

    #[Route('', name: 'admin_gallery_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $file = $this->uploadedImage($request);
        if (null === $file) {
            return $this->problem('Envoie une image JPEG, PNG ou WebP de 8 Mo maximum.');
        }
        $caption = mb_substr(trim((string) $request->request->get('caption', '')), 0, 200);
        $eventId = (string) $request->request->get('event', '');
        $event = '' !== $eventId && Uuid::isValid($eventId) ? $this->events->find($eventId) : null;
        if ('' !== $eventId && null === $event) {
            return $this->problem('Événement introuvable.', Response::HTTP_NOT_FOUND);
        }
        try {
            $stored = $this->storage->store($file, 'gallery');
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage());
        }
        $image = new GalleryImage($stored['file'], $stored['width'], $stored['height'], $caption);
        $image->setEvent($event);
        $this->em->persist($image);
        $this->em->flush();

        return $this->json(Presenter::galleryImage($image, true), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_gallery_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(GalleryImage $image, #[MapRequestPayload] CaptionInput $input): JsonResponse
    {
        $image->setCaption(trim($input->caption));
        $this->em->flush();

        return $this->json(Presenter::galleryImage($image, true));
    }

    #[Route('/{id}', name: 'admin_gallery_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(GalleryImage $image): Response
    {
        $this->storage->delete('gallery', $image->getFile());
        $this->em->remove($image);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

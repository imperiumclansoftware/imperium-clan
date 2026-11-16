<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\GalleryEventInput;
use App\Dto\BranchList;
use App\Entity\GalleryEvent;
use App\Repository\GalleryEventRepository;
use App\Repository\GalleryImageRepository;
use App\Util\Slugs;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/gallery/events')]
#[IsGranted('ROLE_EDITOR')]
final class GalleryEventAdminController extends AdminController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly GalleryEventRepository $events,
        private readonly GalleryImageRepository $images,
    ) {
    }

    #[Route('', name: 'admin_gallery_event_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $counts = $this->events->imageCounts();

        return $this->json(['items' => array_map(
            fn (GalleryEvent $e) => Presenter::galleryEvent($e, $counts[(string) $e->getId()] ?? 0, $this->events->coverOf($e), true),
            $this->events->findOrdered(publishedOnly: false),
        )]);
    }

    #[Route('', name: 'admin_gallery_event_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] GalleryEventInput $input): JsonResponse
    {
        $slug = Slugs::unique($input->title.' '.$input->dateValue()->format('Y'), fn (string $s): bool => null !== $this->events->findOneBy(['slug' => $s]), 'evenement');
        $event = new GalleryEvent($slug, trim($input->title), $input->dateValue());
        $event->update(trim($input->title), $input->dateValue(), trim($input->description), $input->published);
        $event->setBranches(BranchList::parse($input->branches));
        $this->em->persist($event);
        $this->em->flush();

        return $this->json(Presenter::galleryEvent($event, 0, null, true), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_gallery_event_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(GalleryEvent $event, #[MapRequestPayload] GalleryEventInput $input): JsonResponse
    {
        $cover = null;
        if (null !== $input->coverImageId) {
            $cover = $this->images->find($input->coverImageId);
            // La couverture doit être une image DE cet événement (pas une image quelconque de la galerie).
            if (null === $cover || true !== $cover->getEvent()?->getId()->equals($event->getId())) {
                return $this->problem('La couverture doit être une image de l’événement.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }
        $event->update(trim($input->title), $input->dateValue(), trim($input->description), $input->published);
        $event->setBranches(BranchList::parse($input->branches));
        $event->setCover($cover);
        $this->em->flush();

        return $this->json(Presenter::galleryEvent($event, $this->events->imageCounts()[(string) $event->getId()] ?? 0, $this->events->coverOf($event), true));
    }

    /** Supprime l'événement ; ses images restent dans la galerie, « hors événement ». */
    #[Route('/{id}', name: 'admin_gallery_event_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(GalleryEvent $event): Response
    {
        foreach ($this->images->findByEvent($event) as $image) {
            $image->setEvent(null);
        }
        $event->setCover(null);
        $this->em->flush();
        $this->em->remove($event);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

<?php

declare(strict_types=1);

namespace App\Controller\Public;

use App\Api\Presenter;
use App\Dto\BranchList;
use App\Dto\Public\JoinRequestInput;
use App\Entity\GalleryEvent;
use App\Entity\GalleryImage;
use App\Entity\JoinRequest;
use App\Enum\Branch;
use App\Repository\BranchProfileRepository;
use App\Repository\ClanPageRepository;
use App\Repository\GalleryEventRepository;
use App\Repository\GalleryImageRepository;
use App\Repository\MemberRepository;
use App\Repository\NewsArticleRepository;
use App\Repository\ToolRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/** Partie publique : lecture seule, uniquement le contenu publié, plus le dépôt de candidature. */
#[Route('/api/public')]
final class PublicController extends AbstractController
{
    #[Route('/members', name: 'public_members', methods: ['GET'])]
    public function members(MemberRepository $members): JsonResponse
    {
        return $this->json(['items' => array_map(Presenter::member(...), $members->findAllOrdered())]);
    }

    #[Route('/tools', name: 'public_tools', methods: ['GET'])]
    public function tools(ToolRepository $tools): JsonResponse
    {
        return $this->json(['items' => array_map(static fn ($t) => Presenter::tool($t), $tools->findAllOrdered(publishedOnly: true))]);
    }

    #[Route('/pages', name: 'public_pages', methods: ['GET'])]
    public function pages(ClanPageRepository $pages): JsonResponse
    {
        return $this->json(['items' => array_map(static fn ($p) => Presenter::page($p), $pages->findAllOrdered(publishedOnly: true))]);
    }

    #[Route('/news', name: 'public_news', methods: ['GET'])]
    public function news(
        NewsArticleRepository $news,
        #[MapQueryParameter] int $page = 1,
        #[MapQueryParameter] int $size = 12,
        #[MapQueryParameter] ?string $branch = null,
    ): JsonResponse {
        $filter = null !== $branch ? Branch::tryFrom($branch) : null;
        if (null !== $branch && null === $filter) {
            throw new BadRequestHttpException('Branche inconnue.');
        }
        $items = null !== $filter ? $news->findPublishedForBranch($filter, $size) : $news->findPublishedPage($page, $size);

        return $this->json(['items' => array_map(Presenter::newsSummary(...), $items), 'page' => $page]);
    }

    #[Route('/branches', name: 'public_branches', methods: ['GET'])]
    public function branches(BranchProfileRepository $profiles): JsonResponse
    {
        return $this->json(['items' => array_map(Presenter::branchProfile(...), $profiles->findAllOrdered())]);
    }

    #[Route('/news/{slug}', name: 'public_news_show', requirements: ['slug' => '[a-z0-9-]{1,160}'], methods: ['GET'])]
    public function newsShow(NewsArticleRepository $news, string $slug): JsonResponse
    {
        $article = $news->findPublishedBySlug($slug);
        if (null === $article) {
            throw $this->createNotFoundException();
        }

        return $this->json(Presenter::news($article));
    }

    #[Route('/gallery', name: 'public_gallery', methods: ['GET'])]
    public function gallery(
        GalleryImageRepository $images,
        #[MapQueryParameter] int $page = 1,
        #[MapQueryParameter] int $size = 24,
    ): JsonResponse {
        // Images hors événement ; celles des événements se consultent par événement.
        return $this->json(['items' => array_map(static fn (GalleryImage $g) => Presenter::galleryImage($g), $images->findUnassignedPage($page, $size)), 'page' => $page]);
    }

    #[Route('/gallery/events', name: 'public_gallery_events', methods: ['GET'])]
    public function galleryEvents(GalleryEventRepository $events): JsonResponse
    {
        $counts = $events->imageCounts();

        return $this->json(['items' => array_map(
            static fn (GalleryEvent $e) => Presenter::galleryEvent($e, $counts[(string) $e->getId()] ?? 0, $events->coverOf($e)),
            $events->findOrdered(publishedOnly: true),
        )]);
    }

    #[Route('/gallery/events/{slug}', name: 'public_gallery_event', requirements: ['slug' => '[a-z0-9-]{1,140}'], methods: ['GET'])]
    public function galleryEvent(string $slug, GalleryEventRepository $events, GalleryImageRepository $images): JsonResponse
    {
        $event = $events->findPublishedBySlug($slug);
        if (null === $event) {
            throw $this->createNotFoundException();
        }
        $list = $images->findByEvent($event);

        return $this->json(Presenter::galleryEvent($event, \count($list), $events->coverOf($event)) + [
            'images' => array_map(static fn (GalleryImage $g) => Presenter::galleryImage($g), $list),
        ]);
    }

    #[Route('/join-requests', name: 'public_join_request', methods: ['POST'])]
    public function join(
        Request $request,
        #[MapRequestPayload] JoinRequestInput $input,
        RateLimiterFactoryInterface $joinRequestLimiter,
        EntityManagerInterface $em,
        LoggerInterface $logger,
    ): JsonResponse {
        if (!$joinRequestLimiter->create((string) $request->getClientIp())->consume()->isAccepted()) {
            return $this->json(['detail' => 'Trop de candidatures envoyées, réessaie plus tard.'], Response::HTTP_TOO_MANY_REQUESTS);
        }
        // Pot de miel rempli : on répond comme si tout allait bien, sans rien enregistrer.
        if ('' !== $input->website) {
            $logger->info('Candidature ignorée (pot de miel).');

            return $this->json(['status' => 'received'], Response::HTTP_ACCEPTED);
        }

        $discord = null !== $input->discord && '' !== trim($input->discord) ? trim($input->discord) : null;
        $joinRequest = new JoinRequest(trim($input->pseudo), mb_strtolower(trim($input->email)), $discord, trim($input->message));
        $joinRequest->setBranches(BranchList::parse($input->branches));
        $em->persist($joinRequest);
        $em->flush();

        return $this->json(['status' => 'received'], Response::HTTP_ACCEPTED);
    }
}

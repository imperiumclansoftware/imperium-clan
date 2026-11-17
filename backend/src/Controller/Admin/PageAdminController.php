<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\ClanPageInput;
use App\Entity\ClanPage;
use App\Repository\ClanPageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/pages')]
#[IsGranted('ROLE_ADMIN')]
final class PageAdminController extends AdminController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ClanPageRepository $pages,
    ) {
    }

    #[Route('', name: 'admin_page_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json(['items' => array_map(static fn (ClanPage $p) => Presenter::page($p, true), $this->pages->findAllOrdered(publishedOnly: false))]);
    }

    #[Route('', name: 'admin_page_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] ClanPageInput $input): JsonResponse
    {
        if (null !== $this->pages->findOneBy(['slug' => $input->slug])) {
            return $this->problem('Une section utilise déjà cet identifiant.', Response::HTTP_CONFLICT);
        }
        $body = $this->richText($input->content);
        if ($body instanceof JsonResponse) {
            return $body;
        }
        $page = new ClanPage($input->slug, $input->title, $body, $input->position, $input->published);
        $this->em->persist($page);
        $this->em->flush();

        return $this->json(Presenter::page($page, true), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_page_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(ClanPage $page, #[MapRequestPayload] ClanPageInput $input): JsonResponse
    {
        $other = $this->pages->findOneBy(['slug' => $input->slug]);
        if (null !== $other && !$other->getId()->equals($page->getId())) {
            return $this->problem('Une section utilise déjà cet identifiant.', Response::HTTP_CONFLICT);
        }
        $body = $this->richText($input->content);
        if ($body instanceof JsonResponse) {
            return $body;
        }
        $page->update($input->slug, $input->title, $body, $input->position, $input->published);
        $this->em->flush();

        return $this->json(Presenter::page($page, true));
    }

    #[Route('/{id}', name: 'admin_page_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(ClanPage $page): Response
    {
        $this->em->remove($page);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

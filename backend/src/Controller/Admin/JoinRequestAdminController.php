<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\JoinRequestDecisionInput;
use App\Entity\JoinRequest;
use App\Enum\JoinRequestStatus;
use App\Repository\JoinRequestRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/join-requests')]
#[IsGranted('ROLE_ADMIN')]
final class JoinRequestAdminController extends AdminController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', name: 'admin_join_list', methods: ['GET'])]
    public function list(JoinRequestRepository $requests, #[MapQueryParameter] int $page = 1, #[MapQueryParameter] int $size = 20): JsonResponse
    {
        return $this->json(['items' => array_map(Presenter::joinRequest(...), $requests->findPage($page, $size)), 'page' => $page]);
    }

    #[Route('/{id}', name: 'admin_join_decide', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function decide(JoinRequest $joinRequest, #[MapRequestPayload] JoinRequestDecisionInput $input): JsonResponse
    {
        $joinRequest->decide(JoinRequestStatus::from($input->status));
        $this->em->flush();

        return $this->json(Presenter::joinRequest($joinRequest));
    }

    #[Route('/{id}', name: 'admin_join_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(JoinRequest $joinRequest): Response
    {
        $this->em->remove($joinRequest);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

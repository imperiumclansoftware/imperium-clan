<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\ToolInput;
use App\Dto\BranchList;
use App\Entity\Tool;
use App\Repository\ToolRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/tools')]
#[IsGranted('ROLE_ADMIN')]
final class ToolAdminController extends AdminController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', name: 'admin_tool_list', methods: ['GET'])]
    public function list(ToolRepository $tools): JsonResponse
    {
        return $this->json(['items' => array_map(static fn (Tool $t) => Presenter::tool($t, true), $tools->findAllOrdered(publishedOnly: false))]);
    }

    #[Route('', name: 'admin_tool_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] ToolInput $input): JsonResponse
    {
        $tool = new Tool($input->name, $input->url, $input->description, $input->position, $input->published);
        $tool->setBranches(BranchList::parse($input->branches));
        $this->em->persist($tool);
        $this->em->flush();

        return $this->json(Presenter::tool($tool, true), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_tool_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(Tool $tool, #[MapRequestPayload] ToolInput $input): JsonResponse
    {
        $tool->update($input->name, $input->url, $input->description, $input->position, $input->published);
        $tool->setBranches(BranchList::parse($input->branches));
        $this->em->flush();

        return $this->json(Presenter::tool($tool, true));
    }

    #[Route('/{id}', name: 'admin_tool_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(Tool $tool): Response
    {
        $this->em->remove($tool);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

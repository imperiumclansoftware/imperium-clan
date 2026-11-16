<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\BranchProfileInput;
use App\Enum\Branch;
use App\Repository\BranchProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/branches')]
#[IsGranted('ROLE_ADMIN')]
final class BranchAdminController extends AdminController
{
    #[Route('/{code}', name: 'admin_branch_update', requirements: ['code' => 'ICG|ICF|ICC|ICS'], methods: ['PUT'])]
    public function update(string $code, #[MapRequestPayload] BranchProfileInput $input, BranchProfileRepository $profiles, EntityManagerInterface $em): JsonResponse
    {
        $profile = $profiles->getOrCreate(Branch::from($code));
        $profile->update(trim($input->intro), trim($input->body));
        $em->flush();

        return $this->json(Presenter::branchProfile($profile));
    }
}

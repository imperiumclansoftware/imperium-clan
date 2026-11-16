<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Member\MemberSyncException;
use App\Member\MemberSynchronizer;
use App\Repository\MemberRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/members')]
#[IsGranted('ROLE_ADMIN')]
final class MemberAdminController extends AdminController
{
    #[Route('', name: 'admin_member_list', methods: ['GET'])]
    public function list(MemberRepository $members, MemberSynchronizer $sync): JsonResponse
    {
        return $this->json([
            'items' => array_map(Presenter::adminMember(...), $members->findAllOrdered()),
            'syncConfigured' => $sync->isConfigured(),
        ]);
    }

    #[Route('/sync', name: 'admin_member_sync', methods: ['POST'])]
    public function sync(MemberSynchronizer $sync): JsonResponse
    {
        try {
            $report = $sync->run();
        } catch (MemberSyncException $e) {
            return $this->problem($e->getMessage(), Response::HTTP_BAD_GATEWAY);
        }

        return $this->json($report);
    }
}

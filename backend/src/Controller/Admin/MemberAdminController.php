<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\MemberRankInput;
use App\Entity\Member;
use App\Enum\ClanRank;
use App\Member\MemberSyncException;
use App\Member\MemberSynchronizer;
use App\Repository\MemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
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

    /** Grade du règlement. Un seul Empereur : il faut d'abord retirer le grade à l'actuel. */
    #[Route('/{id}/rank', name: 'admin_member_rank', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function rank(Member $member, #[MapRequestPayload] MemberRankInput $input, MemberRepository $members, EntityManagerInterface $em): JsonResponse
    {
        $rank = $input->rank ?? ClanRank::Member;
        if (ClanRank::Emperor === $rank) {
            $current = $members->findOneBy(['rank' => ClanRank::Emperor]);
            if (null !== $current && !$current->getId()->equals($member->getId())) {
                return $this->problem(\sprintf('%s est déjà Empereur : change d’abord son grade.', $current->getPseudo()), Response::HTTP_CONFLICT);
            }
        }
        $member->setRank($rank);
        $em->flush();

        return $this->json(Presenter::adminMember($member));
    }
}

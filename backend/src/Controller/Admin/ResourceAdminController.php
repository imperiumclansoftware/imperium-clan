<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\ResourceInput;
use App\Entity\Resource;
use App\Enum\ResourceCategory;
use App\Media\ResourceStorage;
use App\Repository\ResourceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/admin/resources')]
#[IsGranted('ROLE_ADMIN')]
final class ResourceAdminController extends AdminController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ResourceStorage $storage,
    ) {
    }

    #[Route('', name: 'admin_resource_list', methods: ['GET'])]
    public function list(ResourceRepository $resources): JsonResponse
    {
        return $this->json(['items' => array_map(static fn (Resource $r) => Presenter::resource($r, true), $resources->findAllOrdered(publishedOnly: false))]);
    }

    /** Envoi multipart : file + title, category, description (mêmes règles que ResourceInput). */
    #[Route('', name: 'admin_resource_upload', methods: ['POST'])]
    public function upload(Request $request, ValidatorInterface $validator): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return $this->problem('Envoie un fichier (PNG, JPEG, WebP, SVG, PDF ou ZIP, 30 Mo maximum).');
        }
        $title = trim((string) $request->request->get('title', ''));
        $input = new ResourceInput(
            '' !== $title ? $title : pathinfo($file->getClientOriginalName(), \PATHINFO_FILENAME),
            (string) $request->request->get('category', ResourceCategory::Graphics->value),
            trim((string) $request->request->get('description', '')),
        );
        $violations = $validator->validate($input);
        if (\count($violations) > 0) {
            return $this->problem((string) $violations->get(0)->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        try {
            $stored = $this->storage->store($file, $file->getClientOriginalName());
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage());
        }
        $resource = new Resource(mb_substr($input->title, 0, 120), ResourceCategory::from($input->category), $stored['file'], $stored['downloadName'], $stored['mime'], $stored['size'], $input->description);
        $this->em->persist($resource);
        $this->em->flush();

        return $this->json(Presenter::resource($resource, true), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_resource_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(Resource $resource, #[MapRequestPayload] ResourceInput $input): JsonResponse
    {
        $resource->update($input->title, ResourceCategory::from($input->category), $input->description, $input->position, $input->published);
        $this->em->flush();

        return $this->json(Presenter::resource($resource, true));
    }

    #[Route('/{id}', name: 'admin_resource_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(Resource $resource): Response
    {
        $this->storage->delete($resource->getFile());
        $this->em->remove($resource);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}

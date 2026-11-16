<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Api\Presenter;
use App\Dto\Admin\NewsInput;
use App\Dto\BranchList;
use App\Entity\NewsArticle;
use App\Entity\User;
use App\Media\ImageStorage;
use App\News\RichText;
use App\Repository\NewsArticleRepository;
use App\Util\Slugs;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/news')]
#[IsGranted('ROLE_EDITOR')]
final class NewsAdminController extends AdminController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NewsArticleRepository $news,
        private readonly ImageStorage $storage,
    ) {
    }

    #[Route('', name: 'admin_news_list', methods: ['GET'])]
    public function list(#[MapQueryParameter] int $page = 1, #[MapQueryParameter] int $size = 20): JsonResponse
    {
        return $this->json(['items' => array_map(Presenter::newsSummary(...), $this->news->findAdminPage($page, $size)), 'page' => $page]);
    }

    #[Route('/{id}', name: 'admin_news_show', requirements: ['id' => Requirement::UUID], methods: ['GET'])]
    public function show(NewsArticle $article): JsonResponse
    {
        return $this->json(Presenter::news($article));
    }

    #[Route('', name: 'admin_news_create', methods: ['POST'])]
    public function create(#[CurrentUser] User $user, #[MapRequestPayload] NewsInput $input): JsonResponse
    {
        $body = $this->body($input);
        if ($body instanceof JsonResponse) {
            return $body;
        }
        $article = new NewsArticle($this->uniqueSlug($input->title), $input->title, $input->excerpt, $body, $user->getDisplayName());
        $article->update($input->title, $input->excerpt, $body, $input->publishedAtDate());
        $article->setBranches(BranchList::parse($input->branches));
        $this->em->persist($article);
        $this->em->flush();

        return $this->json(Presenter::news($article), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'admin_news_update', requirements: ['id' => Requirement::UUID], methods: ['PUT'])]
    public function update(NewsArticle $article, #[MapRequestPayload] NewsInput $input): JsonResponse
    {
        $body = $this->body($input);
        if ($body instanceof JsonResponse) {
            return $body;
        }
        $article->update($input->title, $input->excerpt, $body, $input->publishedAtDate());
        $article->setBranches(BranchList::parse($input->branches));
        $this->em->flush();

        return $this->json(Presenter::news($article));
    }

    #[Route('/{id}/cover', name: 'admin_news_cover', requirements: ['id' => Requirement::UUID], methods: ['POST'])]
    public function cover(NewsArticle $article, Request $request): JsonResponse
    {
        $file = $this->uploadedImage($request);
        if (null === $file) {
            return $this->problem('Envoie une image JPEG, PNG ou WebP de 8 Mo maximum.');
        }
        try {
            $stored = $this->storage->store($file, 'news');
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage());
        }
        $this->storage->delete('news', $article->getCoverFile());
        $article->setCoverFile($stored['file']);
        $this->em->flush();

        return $this->json(Presenter::news($article));
    }

    #[Route('/{id}/cover', name: 'admin_news_cover_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function removeCover(NewsArticle $article): JsonResponse
    {
        $this->storage->delete('news', $article->getCoverFile());
        $article->setCoverFile(null);
        $this->em->flush();

        return $this->json(Presenter::news($article));
    }

    #[Route('/{id}', name: 'admin_news_delete', requirements: ['id' => Requirement::UUID], methods: ['DELETE'])]
    public function delete(NewsArticle $article): Response
    {
        $this->storage->delete('news', $article->getCoverFile());
        $this->em->remove($article);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** Texte riche nettoyé (liste blanche) et sérialisé, ou réponse 422 s'il est vide ou invalide. */
    private function body(NewsInput $input): string|JsonResponse
    {
        try {
            $doc = RichText::normalize($input->content);
        } catch (\InvalidArgumentException $e) {
            return $this->problem($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (RichText::isEmpty($doc)) {
            return $this->problem('Écris le texte de l’actualité.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return RichText::encode($doc);
    }

    private function uniqueSlug(string $title): string
    {
        return Slugs::unique($title, fn (string $slug): bool => null !== $this->news->findOneBy(['slug' => $slug]), 'actualite');
    }
}

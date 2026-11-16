<?php

declare(strict_types=1);

namespace App\Setup;

use App\Repository\UserRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Installation d'une instance neuve : tant qu'aucun compte n'existe, la page /installation permet de
 * créer le premier administrateur, sur présentation du jeton d'installation.
 *
 * Le jeton vient de la variable SETUP_TOKEN ou, à défaut, est généré au démarrage (app:setup:token) et
 * affiché dans les logs du conteneur : seul l'exploitant peut donc revendiquer l'instance, pas le premier
 * visiteur venu. Seule son empreinte SHA-256 est écrite sur disque.
 */
final class SetupState
{
    public function __construct(
        private readonly UserRepository $users,
        #[Autowire('%kernel.project_dir%/var/share/setup')]
        private readonly string $dir,
        #[Autowire('%env(default::SETUP_TOKEN)%')]
        private readonly ?string $envToken = null,
    ) {
    }

    public function isRequired(): bool
    {
        return 0 === $this->users->count([]);
    }

    /** Génère un nouveau jeton (32 octets aléatoires) et n'en garde que l'empreinte. */
    public function issueToken(): string
    {
        $token = bin2hex(random_bytes(32));
        $this->ensureDir();
        file_put_contents($this->hashFile(), hash('sha256', $token), \LOCK_EX);
        @chmod($this->hashFile(), 0600);

        return $token;
    }

    public function usesEnvToken(): bool
    {
        return null !== $this->envToken && '' !== $this->envToken;
    }

    public function tokenMatches(string $candidate): bool
    {
        if ('' === $candidate) {
            return false;
        }
        $given = hash('sha256', $candidate);
        if ($this->usesEnvToken()) {
            return hash_equals(hash('sha256', (string) $this->envToken), $given);
        }
        $expected = is_file($this->hashFile()) ? trim((string) file_get_contents($this->hashFile())) : '';

        return '' !== $expected && hash_equals($expected, $given);
    }

    public function clearToken(): void
    {
        if (is_file($this->hashFile())) {
            unlink($this->hashFile());
        }
    }

    /**
     * Exécute $action sous verrou exclusif : deux requêtes simultanées ne peuvent pas créer deux
     * administrateurs (la seconde voit le compte créé par la première).
     *
     * @template T
     *
     * @param callable(): T $action
     *
     * @return T
     */
    public function exclusively(callable $action): mixed
    {
        $this->ensureDir();
        $handle = fopen($this->dir.'/setup.lock', 'c');
        if (false === $handle || !flock($handle, \LOCK_EX)) {
            throw new \RuntimeException('Verrou d’installation indisponible.');
        }
        try {
            return $action();
        } finally {
            flock($handle, \LOCK_UN);
            fclose($handle);
        }
    }

    private function hashFile(): string
    {
        return $this->dir.'/token.sha256';
    }

    private function ensureDir(): void
    {
        if (!is_dir($this->dir) && !mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            throw new \RuntimeException('Dossier d’installation impossible à créer.');
        }
    }
}

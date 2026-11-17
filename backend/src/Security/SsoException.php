<?php

declare(strict_types=1);

namespace App\Security;

/** Échec de la connexion avec Conclave ; le message est montré au visiteur (aucun détail technique). */
final class SsoException extends \RuntimeException
{
}

<?php

declare(strict_types=1);

namespace App\Security;

/** Clé publique RSA au format JWK (n, e) → PEM, pour vérifier une signature RS256 avec OpenSSL. */
final class Jwk
{
    /** @param array<mixed> $jwk */
    public static function toPem(array $jwk): ?string
    {
        if ('RSA' !== ($jwk['kty'] ?? null) || !\is_string($jwk['n'] ?? null) || !\is_string($jwk['e'] ?? null)) {
            return null;
        }
        $n = self::decode($jwk['n']);
        $e = self::decode($jwk['e']);
        if (null === $n || null === $e || \strlen($n) < 256) {
            return null; // clé absente ou trop courte (< 2048 bits)
        }
        $rsaKey = self::seq(self::int($n).self::int($e));
        $algorithm = self::seq("\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00"); // rsaEncryption, NULL
        $der = self::seq($algorithm."\x03".self::len(\strlen($rsaKey) + 1)."\x00".$rsaKey);

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    public static function decode(string $b64url): ?string
    {
        $bytes = base64_decode(strtr($b64url, '-_', '+/'), true);

        return false === $bytes ? null : $bytes;
    }

    private static function int(string $bytes): string
    {
        $bytes = ltrim($bytes, "\x00");
        if ('' === $bytes || \ord($bytes[0]) > 0x7F) {
            $bytes = "\x00".$bytes;
        }

        return "\x02".self::len(\strlen($bytes)).$bytes;
    }

    private static function seq(string $content): string
    {
        return "\x30".self::len(\strlen($content)).$content;
    }

    private static function len(int $length): string
    {
        if ($length < 0x80) {
            return \chr($length);
        }
        $bytes = ltrim(pack('N', $length), "\x00");

        return \chr(0x80 | \strlen($bytes)).$bytes;
    }
}

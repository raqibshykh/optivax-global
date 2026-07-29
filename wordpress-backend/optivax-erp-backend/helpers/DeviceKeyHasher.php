<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Device/Bridge API-key generation and hashing. Plaintext keys are never
 * persisted — only their SHA-256 hash (ItDeviceRepository::rotateApiKey()/
 * fromDtoForCreate()) and last-4 chars (for admin-UI identification) live in
 * the database. The plaintext is handed back to the caller exactly once, at
 * generation/rotation time, the same one-time-reveal pattern as a GitHub PAT.
 */
final class DeviceKeyHasher
{
    /** random_bytes(40) hex-encodes to 80 characters — comfortably clears the "at least 64 random characters" requirement with margin, not a bare-minimum 64. */
    private const KEY_BYTES = 40;

    /**
     * Cryptographically secure (random_bytes(), not mt_rand()/uniqid()).
     * @return array{0:string,1:string,2:string} [plaintext, sha256Hash, last4]
     */
    public static function generate(): array
    {
        $plain = bin2hex(random_bytes(self::KEY_BYTES));
        return [$plain, self::hash($plain), substr($plain, -4)];
    }

    public static function hash(string $plaintext): string
    {
        return hash('sha256', $plaintext);
    }
}

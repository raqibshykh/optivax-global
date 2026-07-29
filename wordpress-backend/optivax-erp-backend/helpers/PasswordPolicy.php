<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shared minimum bar for every password-setting endpoint (change-password,
 * reset-confirm). Deliberately not a full complexity ruleset (no forced
 * uppercase/symbol) — those tend to push users toward predictable patterns
 * like "Password1!" without materially raising real-world strength. Length
 * + a mix of character classes + a common-password blocklist catches the
 * weakest, most-guessed passwords without being punitive.
 */
final class PasswordPolicy
{
    private const MIN_LENGTH = 8;

    /** A short list of the passwords most likely to appear in any credential-stuffing wordlist — not exhaustive, just the obvious ones a length-only check lets through. */
    private const COMMON_PASSWORDS = [
        'password', 'password1', 'password123', '12345678', '123456789',
        'qwerty123', 'letmein123', 'welcome123', 'admin1234', 'iloveyou1',
        'abc123456', '11111111', '00000000', 'changeme1',
    ];

    /** @return string|null An error message if invalid, or null if the password passes. */
    public static function validate(string $password): ?string
    {
        if (strlen($password) < self::MIN_LENGTH) {
            return sprintf('Password must be at least %d characters', self::MIN_LENGTH);
        }
        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
            return 'Password must contain at least one letter and one number';
        }
        if (in_array(strtolower($password), self::COMMON_PASSWORDS, true)) {
            return 'This password is too common — please choose a less predictable one';
        }
        return null;
    }
}

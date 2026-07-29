<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/** Thin wrappers over WP's sanitize_* API, kept in one place so repositories/controllers stay consistent. */
final class Sanitize
{
    public static function text($value): ?string
    {
        return $value === null ? null : sanitize_text_field((string) $value);
    }

    public static function textarea($value): ?string
    {
        return $value === null ? null : sanitize_textarea_field((string) $value);
    }

    public static function email($value): ?string
    {
        return $value === null ? null : sanitize_email((string) $value);
    }

    public static function key($value): ?string
    {
        return $value === null ? null : sanitize_key((string) $value);
    }

    public static function int($value): ?int
    {
        return $value === null ? null : (int) $value;
    }

    public static function float($value): ?float
    {
        return $value === null ? null : (float) $value;
    }

    public static function bool($value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function url($value): ?string
    {
        return $value === null ? null : esc_url_raw((string) $value);
    }

    /** JSON-encodes an array/object field for storage in a JSON/TEXT column. */
    public static function json($value): string
    {
        return wp_json_encode($value ?? []);
    }

    public static function jsonDecode(?string $value): array
    {
        if (!$value) {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}

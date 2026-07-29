<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * The one place a biometric device's punch timestamp gets converted between
 * UTC (stored, for unambiguous ordering/dedupe math) and the site's local
 * timezone (used for the calendar `date` a punch belongs to, and the
 * `HH:MM` check_in/check_out strings attendance_records already stores) —
 * reuses WordPress's own configured timezone (`wp_timezone()`, Settings ->
 * General) rather than inventing a second company-timezone setting.
 */
final class AttendanceTimezone
{
    /**
     * @param string $iso8601 e.g. "2026-07-14T09:03:11+05:00". A string with
     * no explicit offset is treated as already-UTC (deterministic default,
     * never a silent guess at the device's local zone) rather than falling
     * back to PHP's process default timezone.
     */
    public static function parseToUtc(string $iso8601): ?\DateTimeImmutable
    {
        $trimmed = trim($iso8601);
        if ($trimmed === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable($trimmed, new \DateTimeZone('UTC'));
        } catch (\Throwable $e) {
            return null;
        }
        return $dt->setTimezone(new \DateTimeZone('UTC'));
    }

    /** The calendar date (site-local) a UTC instant belongs to — what attendance_records.date and it_biometric_punches.attendance_date store. */
    public static function localDate(\DateTimeImmutable $utc): string
    {
        return $utc->setTimezone(wp_timezone())->format('Y-m-d');
    }

    /** HH:MM in site-local time — the exact string shape attendance_records.check_in/check_out already use. */
    public static function localTime(\DateTimeImmutable $utc): string
    {
        return $utc->setTimezone(wp_timezone())->format('H:i');
    }
}

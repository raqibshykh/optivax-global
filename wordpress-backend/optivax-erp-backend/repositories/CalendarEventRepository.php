<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/calendar-events/* (eventService.ts / CalendarEvent in
 * src/types/index.ts). `start`/`end` are backtick-quoted reserved words in
 * the CREATE TABLE DDL (see CrossCuttingMigration), but that's purely a
 * DDL-syntax concern — $wpdb->insert()/update() always quote column names,
 * and reads here go through SELECT *, so no quoting is needed in this file.
 */
final class CalendarEventRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'calendar_events';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'start' => $row['start'],
            'end' => $row['end'],
            'description' => $row['description'] ?: null,
            'allDay' => isset($row['all_day']) ? (bool) $row['all_day'] : null,
            'type' => $row['type'],
            'color' => $row['color'] ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'title' => Sanitize::text($data['title'] ?? ''),
            'start' => Sanitize::text($data['start'] ?? ''),
            'end' => Sanitize::text($data['end'] ?? ''),
            'description' => Sanitize::textarea($data['description'] ?? null),
            'all_day' => array_key_exists('allDay', $data) ? (Sanitize::bool($data['allDay']) ? 1 : 0) : 0,
            'type' => Sanitize::text($data['type'] ?? 'other'),
            'color' => Sanitize::text($data['color'] ?? null),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('title', $data)) {
            $row['title'] = Sanitize::text($data['title']);
        }
        if (array_key_exists('start', $data)) {
            $row['start'] = Sanitize::text($data['start']);
        }
        if (array_key_exists('end', $data)) {
            $row['end'] = Sanitize::text($data['end']);
        }
        if (array_key_exists('description', $data)) {
            $row['description'] = Sanitize::textarea($data['description']);
        }
        if (array_key_exists('allDay', $data)) {
            $row['all_day'] = Sanitize::bool($data['allDay']) ? 1 : 0;
        }
        if (array_key_exists('type', $data)) {
            $row['type'] = Sanitize::text($data['type']);
        }
        if (array_key_exists('color', $data)) {
            $row['color'] = Sanitize::text($data['color']);
        }
        return $row;
    }
}

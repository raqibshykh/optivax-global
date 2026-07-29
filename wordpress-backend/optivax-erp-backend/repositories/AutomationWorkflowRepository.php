<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/automation/workflows (automationService.ts's AutomationWorkflow). */
final class AutomationWorkflowRepository extends AbstractRepository
{
    protected function tableName(): string
    {
        return 'automation_workflows';
    }

    protected function toDto(array $row): array
    {
        $config = Sanitize::jsonDecode($row['config'] ?? null);
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'trigger_event' => $row['trigger_event'],
            'enabled' => (bool) $row['enabled'],
            'callback_class' => $row['callback_class'],
            'config' => $config ?: null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'trigger_event' => Sanitize::text($data['trigger_event'] ?? ''),
            'enabled' => array_key_exists('enabled', $data) ? (Sanitize::bool($data['enabled']) ? 1 : 0) : 1,
            'callback_class' => Sanitize::text($data['callback_class'] ?? ''),
            'config' => Sanitize::json($data['config'] ?? []),
        ];
    }

    /**
     * Partial-update map: only columns whose frontend key is present in the
     * patch are touched. Matters most for PATCH /automation/workflows/{id},
     * which only ever sends { enabled } — reusing fromDtoForCreate's
     * always-set-every-column shape would blank out name/trigger_event/etc.
     */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('trigger_event', $data)) {
            $row['trigger_event'] = Sanitize::text($data['trigger_event']);
        }
        if (array_key_exists('enabled', $data)) {
            $row['enabled'] = Sanitize::bool($data['enabled']) ? 1 : 0;
        }
        if (array_key_exists('callback_class', $data)) {
            $row['callback_class'] = Sanitize::text($data['callback_class']);
        }
        if (array_key_exists('config', $data)) {
            $row['config'] = Sanitize::json($data['config']);
        }
        return $row;
    }
}

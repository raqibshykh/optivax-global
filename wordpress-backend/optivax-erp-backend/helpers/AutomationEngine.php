<?php

namespace OptivaxERP\Helpers;

use OptivaxERP\Repositories\AutomationWorkflowRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Gives `automation_workflows` rows real teeth (Phase 8 M2: "a UI-only toggle
 * with zero backend enforcement"). The schema already carries a
 * `callback_class` + `config` column pair per row — this is the dispatcher
 * that resolves and invokes them, called from the few business events that
 * exist as named triggers today (see fire() call sites: client creation,
 * project completion, invoice overdue). One broken/misconfigured workflow
 * must never break the request that triggered it — every failure is caught
 * and logged, never re-thrown.
 */
final class AutomationEngine
{
    /**
     * @param string $triggerEvent must match a row's `trigger_event` exactly
     * (e.g. 'new_client', 'project_complete', 'invoice_overdue').
     * @param array $context event payload passed straight through to the
     * callback class's handle() — shape depends on the event, not enforced
     * here (documented at each fire() call site).
     */
    public static function fire(string $triggerEvent, array $context = []): void
    {
        try {
            $repo = new AutomationWorkflowRepository();
            $workflows = $repo->list(['trigger_event' => $triggerEvent, 'enabled' => 1]);
        } catch (\Throwable $e) {
            Logger::error('automation', "Failed to load workflows for '{$triggerEvent}': " . $e->getMessage());
            return;
        }

        foreach ($workflows as $workflow) {
            self::invoke($workflow, $context);
        }
    }

    private static function invoke(array $workflow, array $context): void
    {
        $class = (string) ($workflow['callback_class'] ?? '');
        if ($class === '' || !class_exists($class) || !method_exists($class, 'handle')) {
            Logger::error('automation', "Workflow '{$workflow['name']}' references an unresolvable callback_class '{$class}'", [
                'workflowId' => $workflow['id'] ?? null,
            ]);
            return;
        }

        try {
            $class::handle((array) ($workflow['config'] ?? []), $context);
            Logger::info('automation', "Workflow '{$workflow['name']}' fired for trigger '{$workflow['trigger_event']}'", [
                'workflowId' => $workflow['id'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Logger::error('automation', "Workflow '{$workflow['name']}' failed: " . $e->getMessage(), [
                'workflowId' => $workflow['id'] ?? null,
            ]);
        }
    }
}

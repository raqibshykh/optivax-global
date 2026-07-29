<?php

namespace OptivaxERP\Automation;

use OptivaxERP\Notifications\NotificationService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * The one built-in `automation_workflows.callback_class` implementation:
 * turns an enabled workflow into a real notification, reusing the same
 * NotificationService infrastructure the rest of the app already trusts
 * (see NotificationService::broadcastToDepartment(), previously wired to
 * nothing). A workflow row's `config` JSON selects who gets notified:
 *
 *   { "title": "...", "message": "New client {clientName} added",
 *     "recipientUserId": "42" }               // one specific user
 *   { ..., "recipientDepartment": "dept-sales" } // everyone in a department
 *   { ... }                                       // no recipient key: falls
 *                                                  // back to $context['userId']
 *                                                  // (the event's own subject)
 *
 * `message`/`title` support `{key}` placeholders substituted from $context.
 */
final class NotifyWorkflowCallback
{
    public static function handle(array $config, array $context): void
    {
        $title = self::render((string) ($config['title'] ?? 'Automation notification'), $context);
        $message = self::render((string) ($config['message'] ?? ''), $context);

        $base = [
            'type' => (string) ($config['type'] ?? 'system'),
            'module' => $config['module'] ?? null,
            'title' => $title,
            'message' => $message,
            'actionUrl' => $config['actionUrl'] ?? null,
            'actionLabel' => $config['actionLabel'] ?? null,
        ];

        if (!empty($config['recipientDepartment'])) {
            NotificationService::broadcastToDepartment((string) $config['recipientDepartment'], $base);
            return;
        }

        $recipientId = $config['recipientUserId'] ?? $context['userId'] ?? null;
        if ($recipientId === null || $recipientId === '') {
            return;
        }

        NotificationService::create(array_merge($base, ['userId' => (string) $recipientId]));
    }

    /** Replaces every {key} in $template with $context[key], leaving unknown placeholders untouched. */
    private static function render(string $template, array $context): string
    {
        if ($template === '' || strpos($template, '{') === false) {
            return $template;
        }
        return (string) preg_replace_callback('/\{([a-zA-Z0-9_]+)\}/', function (array $m) use ($context): string {
            $value = $context[$m[1]] ?? null;
            return $value === null ? $m[0] : (string) $value;
        }, $template);
    }
}

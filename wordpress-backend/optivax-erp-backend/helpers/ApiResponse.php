<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every REST response in this plugin is wrapped in this exact envelope,
 * because src/lib/client.ts on the frontend unwraps `data` and treats
 * `success === false` (even on a 2xx status) as a failure.
 */
final class ApiResponse
{
    public static function ok($data, array $meta = [], int $status = 200): \WP_REST_Response
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if (!empty($meta)) {
            $body['meta'] = $meta;
        }
        return new \WP_REST_Response($body, $status);
    }

    public static function error(string $message, int $status = 400, $details = null): \WP_REST_Response
    {
        $body = [
            'success' => false,
            'data' => null,
            'error' => $message,
        ];
        if ($details !== null) {
            $body['details'] = $details;
        }
        return new \WP_REST_Response($body, $status);
    }

    public static function unauthorized(string $message = 'Authentication required'): \WP_REST_Response
    {
        return self::error($message, 401);
    }

    public static function forbidden(string $message = 'You do not have permission to perform this action'): \WP_REST_Response
    {
        return self::error($message, 403);
    }

    public static function notFound(string $message = 'Not found'): \WP_REST_Response
    {
        return self::error($message, 404);
    }

    public static function validationError(string $message, $details = null): \WP_REST_Response
    {
        return self::error($message, 422, $details);
    }

    public static function serverError(string $message = 'Internal server error'): \WP_REST_Response
    {
        return self::error($message, 500);
    }

    /**
     * Full diagnostic error envelope for endpoints that must never hide the
     * real exception behind a generic message (e.g. the biometric TCP
     * connector) — adds `message`/`file`/`line` (and, in development mode
     * only, `stack`) on top of the standard {success,data,error} shape every
     * other endpoint already uses, so existing generic error handling
     * (client.ts's `body?.error`) keeps working unchanged for callers that
     * don't need the extra detail.
     */
    public static function exceptionError(string $message, \Throwable $e, int $status = 500): \WP_REST_Response
    {
        $body = [
            'success' => false,
            'data' => null,
            'error' => $e->getMessage(),
            'message' => $message,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];
        if (self::isDebugMode()) {
            $body['stack'] = $e->getTraceAsString();
        }
        return new \WP_REST_Response($body, $status);
    }

    /** Gates stack-trace exposure — WordPress's own standard debug flag, so no separate plugin setting is needed to control this. */
    private static function isDebugMode(): bool
    {
        return defined('WP_DEBUG') && WP_DEBUG;
    }
}

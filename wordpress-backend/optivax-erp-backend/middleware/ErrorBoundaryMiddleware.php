<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Guarantees every /saas/v1/* response uses this plugin's {success,data,error}
 * envelope, even when a controller throws. Without this, an uncaught
 * \Throwable (a DB error, a TypeError from unexpected input, etc.) would
 * surface as WordPress core's own REST error shape ({code,message,data}) —
 * a different, frontend-incompatible shape for the one case (an unhandled
 * server fault) where callers most need a predictable response to branch on.
 *
 * Hooked via the `rest_dispatch_request` filter, which lets us take over the
 * actual handler invocation for our own namespace only; every other
 * namespace's routes (WP core, other plugins) are left completely alone by
 * returning $dispatchResult unchanged.
 */
final class ErrorBoundaryMiddleware
{
    public static function register(): void
    {
        add_filter('rest_dispatch_request', [self::class, 'wrap'], 10, 4);
    }

    /**
     * @param mixed $dispatchResult Non-null if an earlier filter (or WP core)
     * already produced a result — left untouched in that case.
     * @param \WP_REST_Request $request
     * @param string $route The matched route, e.g. "/saas/v1/tasks".
     * @param array $handler The matched route's registration args (has 'callback').
     */
    public static function wrap($dispatchResult, \WP_REST_Request $request, string $route, array $handler)
    {
        if ($dispatchResult !== null) {
            return $dispatchResult;
        }
        if (strpos($route, '/' . OPTIVAX_ERP_NAMESPACE . '/') !== 0) {
            return null; // Not one of ours — let WordPress dispatch normally.
        }
        if (!isset($handler['callback']) || !is_callable($handler['callback'])) {
            return null; // Malformed handler — let WP's own path report it.
        }

        try {
            return call_user_func($handler['callback'], $request);
        } catch (\Throwable $e) {
            Logger::error('rest-dispatch', $e->getMessage(), [
                'route' => $route,
                'method' => $request->get_method(),
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Same diagnostic shape ApiResponse::exceptionError() already
            // gives controller-level catches (message/file/line always,
            // stack only under WP_DEBUG) — a Throwable escaping all the way
            // to this outer boundary shouldn't degrade to less detail than
            // one caught closer to its source.
            return ApiResponse::exceptionError('Internal server error', $e);
        }
    }
}

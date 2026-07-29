<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\SecurityAuditLog;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Double-submit-cookie CSRF protection.
 *
 * This app authenticates via an HttpOnly cookie (see AuthMiddleware) with
 * SameSite=None — required so the cookie is sent on cross-origin
 * `credentials:"include"` fetches from the real frontend, but that same
 * setting means the browser will also attach it to a forged cross-site
 * request (a malicious page's <form> submit or fetch). CORS's origin
 * allow-list only stops an attacker's JavaScript from *reading* the
 * response; it does not stop a "simple" cross-site request (e.g. a
 * multipart/form-data <form> POST, which needs no preflight) from
 * *executing* server-side with the victim's cookies attached.
 *
 * Fix: every state-changing request must also carry an X-CSRF-Token header
 * matching the (non-HttpOnly) `optivax_csrf` cookie value. A same-origin
 * page can read that cookie via JS and echo it back; a cross-site attacker's
 * page cannot (browser same-origin policy blocks reading another origin's
 * cookies), so it cannot produce a matching header even though the
 * HttpOnly auth cookie itself still rides along automatically.
 *
 * Hooked at priority 5 on `rest_dispatch_request` — earlier than
 * ErrorBoundaryMiddleware (priority 10), so a CSRF rejection here short-
 * circuits before the controller (and its DB writes) ever run, and the
 * error boundary sees a non-null $dispatchResult and passes it through.
 */
final class CsrfMiddleware
{
    /** Methods that can mutate state — the only ones checked. GET/HEAD/OPTIONS are exempt (no side effects expected). */
    private const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public static function register(): void
    {
        add_filter('rest_dispatch_request', [self::class, 'check'], 5, 4);
    }

    public static function check($dispatchResult, \WP_REST_Request $request, string $route, array $handler)
    {
        if ($dispatchResult !== null) {
            return $dispatchResult;
        }
        if (strpos($route, '/' . OPTIVAX_ERP_NAMESPACE . '/') !== 0) {
            return null; // Not one of ours.
        }
        if (!in_array($request->get_method(), self::PROTECTED_METHODS, true)) {
            return null;
        }

        // No access-token cookie => this request isn't relying on an
        // authenticated cookie session (e.g. login itself, or an
        // unauthenticated call that will fail its own auth check
        // downstream) — nothing for CSRF to protect here.
        if (empty($_COOKIE[AuthMiddleware::COOKIE_ACCESS])) {
            return null;
        }

        $cookieToken = $_COOKIE[AuthMiddleware::COOKIE_CSRF] ?? '';
        $headerToken = $request->get_header('X-CSRF-Token') ?? '';

        if ($cookieToken === '' || $headerToken === '' || !hash_equals($cookieToken, $headerToken)) {
            SecurityAuditLog::record('csrf_check_failed', null, null, null, 'failure', null, null, [
                'route' => $route,
                'method' => $request->get_method(),
            ]);
            return ApiResponse::error('CSRF validation failed', 403);
        }

        return null;
    }
}

<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\RbacMatrix;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Authorization gate every controller calls right after AuthMiddleware.
 * Uses the *unscoped* matrix check (hasPermission in rbac.ts) by default,
 * matching AuthContext.checkPermission's semantics — controllers that need
 * the frontend's stricter "own-domain-only" rule for non-VIEW actions can
 * call authorizeScoped() instead (hasPermissionScoped in rbac.ts).
 */
final class RbacMiddleware
{
    /**
     * Runs auth + RBAC together. Returns a WP_REST_Response (401/403) to
     * short-circuit with, or null if the request may proceed.
     */
    public static function authorize(string $domain, string $action): ?\WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $role = $claims['role'] ?? null;
        if (!$role || !RbacMatrix::hasPermission($role, $domain, $action)) {
            return ApiResponse::forbidden();
        }

        return null;
    }

    public static function authorizeScoped(string $domain, string $action): ?\WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $role = $claims['role'] ?? null;
        if (!$role || !RbacMatrix::hasPermissionScoped($role, $domain, $action)) {
            return ApiResponse::forbidden();
        }

        return null;
    }

    /** For endpoints that only require a valid session, no domain permission (e.g. GET /auth/session). */
    public static function requireAuthOnly(): ?\WP_REST_Response
    {
        return AuthMiddleware::currentClaims() ? null : ApiResponse::unauthorized();
    }
}

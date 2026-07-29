<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\SocialTrackingRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/social-links/* and /saas/v1/social-analytics/*
 * (src/services/socialTrackingService.ts). Wraps SocialTrackingRepository's
 * bespoke methods as REST handlers, all gated on the 'marketing' RBAC domain
 * per the plan — note that this means POST /social-links/track (recording a
 * link click) requires an authenticated marketing-domain session, same as
 * every other endpoint here. If clicks need to be recorded from anonymous,
 * public-facing traffic in a later phase, trackClick() will need its own
 * unauthenticated allowance; flagged in the final report rather than decided
 * unilaterally here.
 */
final class SocialTrackingController
{
    private SocialTrackingRepository $repo;

    public function __construct()
    {
        $this->repo = new SocialTrackingRepository();
    }

    public function listLinks(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->listLinks());
    }

    public function createLink(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'CREATE');
        if ($guard) {
            return $guard;
        }
        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'platform' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return ApiResponse::ok($this->repo->createLink($data), [], 201);
    }

    public function updateLink(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $updated = $this->repo->updateLink((string) $id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($updated);
    }

    public function deleteLink(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $this->repo->deleteLink((string) $id);
        return ApiResponse::ok(null);
    }

    public function trackClick(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        return ApiResponse::ok($this->repo->trackClick($data), [], 201);
    }

    public function getAnalytics(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->getAnalytics());
    }

    public function getAccountMetrics(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'VIEW');
        if ($guard) {
            return $guard;
        }
        return ApiResponse::ok($this->repo->getAccountMetrics());
    }

    public function syncAccountMetrics(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $linkId = $data['linkId'] ?? null;
        if (!$linkId) {
            return ApiResponse::validationError('Missing "linkId" in request body');
        }

        return ApiResponse::ok($this->repo->syncAccountMetrics((string) $linkId), [], 201);
    }
}

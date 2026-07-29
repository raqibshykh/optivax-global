<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Repositories\MarketingCampaignRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/marketing-campaigns (src/services/marketingCampaignService.ts).
 * REST-verb style (GET/POST on the collection, PUT on /{id}) rather than the
 * RPC-suffix style used elsewhere — matches the frontend service's exact
 * request shape. No delete endpoint exists on the frontend, so none is
 * registered here.
 */
final class MarketingCampaignRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new MarketingCampaignRepository(), 'marketing');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/marketing-campaigns', [
            'methods' => 'GET',
            'callback' => [$controller, 'listHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/marketing-campaigns', [
            'methods' => 'POST',
            'callback' => static function (\WP_REST_Request $request) use ($controller) {
                $errors = Validator::check($request->get_json_params() ?: [], [
                    'name' => ['required'],
                    'platform' => ['required'],
                    'status' => [['in', ['Active', 'Draft', 'Completed']]],
                    'budget' => ['numeric', ['min', 0]],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return $controller->createHandler($request);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/marketing-campaigns/(?P<id>[\w-]+)', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateByRouteIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
